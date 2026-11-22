import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Search, Plus, Trash2, Printer, Stethoscope, Receipt, ChevronDown, FileText, AlertCircle, FileCheck } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RoleGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useDB } from "@/lib/useStore";
import { opdService } from "@/services/opdService";
import { medicalService } from "@/services/medicalService";
import { receptionService } from "@/services/receptionService";
import { apiService } from "@/api/apiService";
import { handlePrintMlc, handlePrintEmergency, handlePrintReceipt } from "./reception";
import type { Patient, PrescribedMedicine, Prescription } from "@/lib/store";

export const Route = createFileRoute("/opd")({
  head: () => ({ meta: [{ title: "OPD — MediCore HMS" }, { name: "description", content: "OPD queue and prescriptions." }] }),
  component: () => (
    <RequireAuth module="OPD" action="Access">
      <AppShell><OPDPage /></AppShell>
    </RequireAuth>
  ),
});
import type { Medicine } from "@/lib/store";

const emptyRow = (): PrescribedMedicine => ({ medicineId: "", name: "", morning: "", afternoon: "", evening: "", night: "" });

function MedicineAutocomplete({ value, selectedName, onSelect }: { value: string, selectedName: string, onSelect: (id: string, name: string) => void }) {
  const db = useDB();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Medicine[]>([]);
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    setQ(selectedName || "");
  }, [selectedName]);

  useEffect(() => {
    if (q.trim().length >= 2 && open) {
      const timer = setTimeout(async () => {
        const res = await medicalService.searchMedicine(q.trim());
        setResults(res);
        setSelectedIndex(-1);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setResults([]);
      setSelectedIndex(-1);
    }
  }, [q, open]);

  const handleBlur = () => {
    setTimeout(() => {
      setOpen(false);
      setQ(selectedName || "");
    }, 200);
  };

  const handleSelect = async (mId: string, mName: string) => {
    console.log("handleSelect selected medicine:", mId, mName);
    setQ(mName);
    onSelect(mId, mName);
    setOpen(false);
    try {
      const numId = parseInt(mId, 10);
      if (!isNaN(numId)) {
        await apiService.medicines.getById(numId);
      }
    } catch (err) {
      console.error("Failed to fetch medicine by id:", err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || results.length === 0) return;
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        handleSelect(results[selectedIndex].id, results[selectedIndex].name);
      } else if (results.length > 0) {
        // Fallback to first if none selected
        handleSelect(results[0].id, results[0].name);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="relative w-full">
      <Input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="Search medicine..."
        className="w-full"
      />
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 mt-1 w-full bg-popover text-popover-foreground rounded-md border shadow-md z-10 overflow-hidden max-h-48 overflow-y-auto">
          {results.map((m, idx) => (
            <div key={m.id} className={`px-3 py-2 text-sm hover:bg-muted cursor-pointer flex justify-between ${selectedIndex === idx ? "bg-muted text-accent-foreground" : ""}`} onMouseDown={async (e) => {
              e.preventDefault();
              await handleSelect(m.id, m.name);
            }}>
              <span>{m.name}</span> <span className="text-muted-foreground text-xs">(Stock: {m.quantity})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OPDPage() {
  const db = useDB();
  const [q, setQ] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [q]);

  const [active, setActive] = useState<Patient | null>(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [disease, setDisease] = useState("");
  const [rows, setRows] = useState<PrescribedMedicine[]>([]);
  const [suggestion, setSuggestion] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [course, setCourse] = useState("");
  const [printData, setPrintData] = useState<{ p: Patient; rx: Prescription } | null>(null);

  useEffect(() => {
    medicalService.listMedicines();
    receptionService.listPatients();
  }, []);

  const opdPatients = useMemo(() => {
    return db.patients
      .filter((p) => !q || p.code.toLowerCase().includes(q.toLowerCase()) || p.name.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));
  }, [db.patients, q]);

  const totalPages = Math.ceil(opdPatients.length / itemsPerPage);
  const paginatedPatients = useMemo(() => {
    return opdPatients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [opdPatients, currentPage]);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (deleteId) {
      await receptionService.deletePatient(deleteId);
      toast.success("Patient deleted");
      setDeleteId(null);
    }
  };

  const openPrescribe = (p: Patient) => {
    setActive(p);
    setDiagnosis(""); setDisease(""); setSuggestion(""); setFollowUp(""); setCourse("");
    setRows(Array.from({ length: 5 }, emptyRow));
    setRows(Array.from({ length: 5 }, emptyRow));
  };

  const openPrint = async (p: Patient) => {
    const rx = await opdService.latestForPatient(p.id);
    if (rx) {
      setPrintData({ p, rx });
    } else {
      toast.error("No prescription found for this patient");
    }
  };

  const handlePrint = (p: Patient, rx: Prescription, settings: any) => {
    let printIframe = document.getElementById("print-iframe") as HTMLIFrameElement;
    if (!printIframe) {
      printIframe = document.createElement("iframe");
      printIframe.id = "print-iframe";
      printIframe.style.position = "absolute";
      printIframe.style.width = "0";
      printIframe.style.height = "0";
      printIframe.style.border = "none";
      document.body.appendChild(printIframe);
    }
    const printWindow = printIframe.contentWindow;
    if (!printWindow) return;
    
    const logoUrl = settings?.logoUrl && settings.logoUrl !== '/logo.png' && settings.logoUrl !== '/logo.jpg' ? settings.logoUrl : '/lifecare-logo.jpg';
    
    const showSlot = (v: string) => {
      if (v === "true") return "1";
      if (v === "false") return "";
      return v;
    };

    const medicinesHtml = `
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 13px; font-weight: 500;">
        <thead>
          <tr>
            <th style="text-align: left; border-bottom: 1px solid #ccc; padding: 8px;">Medicine</th>
            <th style="text-align: center; border-bottom: 1px solid #ccc; padding: 8px;">M</th>
            <th style="text-align: center; border-bottom: 1px solid #ccc; padding: 8px;">A</th>
            <th style="text-align: center; border-bottom: 1px solid #ccc; padding: 8px;">E</th>
            <th style="text-align: center; border-bottom: 1px solid #ccc; padding: 8px;">N</th>
          </tr>
        </thead>
        <tbody>
          ${rx.medicines.map(m => {
            const displaySlot = (v: string) => {
              if (v === "true") return "1";
              if (v === "false" || !v) return "";
              return v;
            };
            return '<tr>' +
              '<td style="padding: 8px; border-bottom: 1px solid #eee;">' + m.name + '</td>' +
              '<td style="text-align: center; padding: 8px; border-bottom: 1px solid #eee;">' + displaySlot(m.morning) + '</td>' +
              '<td style="text-align: center; padding: 8px; border-bottom: 1px solid #eee;">' + displaySlot(m.afternoon) + '</td>' +
              '<td style="text-align: center; padding: 8px; border-bottom: 1px solid #eee;">' + displaySlot(m.evening) + '</td>' +
              '<td style="text-align: center; padding: 8px; border-bottom: 1px solid #eee;">' + displaySlot(m.night) + '</td>' +
            '</tr>';
          }).join("")}
        </tbody>
      </table>
    `;
    printWindow!.document.write(`
      <html>
        <head>
          <title>Prescription — ${p.name}</title>
          <style>
            @page { margin: 0; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 0; margin: 0; color: #111; line-height: 1.6; min-height: 100vh; display: flex; flex-direction: column; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .page-padding { padding: 0 20px 20px 20px; }
            .top-section { 
              background-color: #4b4b4b !important; 
              margin: 20px 20px 30px 20px;
              border-radius: 40px;
              display: flex; 
              align-items: center; 
              justify-content: space-between; 
              height: 120px;
              position: relative;
            }
            .logo-container { 
              background-color: white !important;
              height: 100%;
              width: calc(100% - 180px);
              border-radius: 40px 0 0 40px;
              display: flex;
              align-items: center;
              justify-content: flex-start;
              padding: 0;
              box-sizing: border-box;
            }
            .logo-container img { width: 100%; height: 100%; border-radius: 40px 0 0 40px; object-fit: fill; }
            .helpline-circle {
              background-color: white !important;
              width: 150px;
              height: 150px;
              border-radius: 50%;
              position: absolute;
              right: 20px;
              top: 50%;
              transform: translateY(-50%);
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              box-shadow: 0 4px 10px rgba(0,0,0,0.15);
            }
            .helpline-circle span { color: #e53e3e; }
            .helpline-title { font-size: 14px; margin-bottom: 5px; }
            .helpline-number { font-size: 18px; font-weight: bold; }
            .watermark {
              position: fixed;
              top: 50%;
              left: calc(50% + 70px);
              transform: translate(-50%, -50%);
              -webkit-transform: translate(-50%, -50%);
              opacity: 0.13;
              z-index: 0;
              pointer-events: none;
              width: 100%;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            .watermark img {
              width: 100%;
              max-width: 800px;
              object-fit: contain;
              transform: rotate(-45deg);
              -webkit-transform: rotate(-45deg);
            }
            .hospital-address-bar { text-align: center; font-size: 16px; font-weight: bold; color: #555; margin-bottom: 10px; text-transform: uppercase; }
            .details-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px 15px; margin-bottom: 15px; font-size: 14px; padding-bottom: 10px; border-bottom: 1px solid #888; }
            .details-item span { color: #666; font-size: 12px; display: block; margin-bottom: 1px; }
            .details-item b { font-size: 14px; color: #111; }
            .rx { font-size: 24px; color: #e53e3e; font-style: italic; font-weight: bold; margin-bottom: 5px; letter-spacing: 1px; }
            .medicines { list-style: none; padding: 0; margin: 0 0 30px 0; font-size: 15px; font-weight: 500; display: flex; flex-direction: column; gap: 12px; }
            .complaint-box { border: 1px solid #333; padding: 15px; font-size: 14px; color: #e53e3e; margin-bottom: 20px; min-height: 50px; font-weight: 500; }
            table.vitals { width: 100%; border-collapse: collapse; font-size: 13px; }
            table.vitals th, table.vitals td { border: 1px solid #888; padding: 8px 12px; }
            table.vitals th { color: #e53e3e; font-weight: 600; text-align: left; }
            table.vitals td { font-weight: 500; }
            .footer { margin-top: 50px; text-align: center; font-size: 20px; font-weight: bold; color: #e53e3e; letter-spacing: 1px; }
            .footer span { color: #555; font-weight: bold; }
            .sidebar {
              position: fixed;
              top: 0;
              left: 0;
              bottom: 0;
              width: 140px;
              background-color: #111 !important;
              display: flex;
              flex-direction: column;
              align-items: center;
              padding: 0;
              z-index: 100;
              overflow: hidden;
            }
            .sidebar img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .main-content {
              margin-left: 140px;
              flex: 1;
              display: flex;
              flex-direction: column;
              padding-bottom: 20px;
              position: relative;
            }
            .content-wrapper { flex: 1; position: relative; z-index: 1; background: transparent; }
            .custom-footer {
              margin-top: auto;
              margin-right: 20px;
              margin-left: 20px;
              display: flex;
              flex-direction: column;
              position: relative;
            }
            .footer-line {
              height: 4px;
              background-color: #0b2d6a;
              width: 100%;
              margin-bottom: 10px;
            }
            .footer-content {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              position: relative;
            }
            .footer-text {
              flex: 1;
              padding-right: 150px;
            }
            .gujarati-bold {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              font-weight: 700;
              font-size: 14px;
              color: #111;
              line-height: 1.5;
            }
            .footer-bottom-row {
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
              margin-top: 5px;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              font-weight: 700;
              font-size: 13px;
              color: #111;
            }
            .red-helpline {
              color: #e53e3e;
              font-size: 15px;
              white-space: nowrap;
            }
            .emergency-logo-container {
              position: absolute;
              right: 0;
              bottom: 0;
              width: 140px;
              background-color: white;
              padding: 5px;
            }
            .emergency-logo {
              width: 100%;
              height: auto;
              object-fit: contain;
            }
          </style>
        </head>
        <body>
          <div class="sidebar">
            <img src="/hospital_collage.jpg" alt="Hospital Collage" />
          </div>
          <div class="main-content">
            <div class="content-wrapper">
              <div class="watermark">
                <img src="${logoUrl}" alt="Watermark" onerror="this.src='/lifecare-logo.jpg'" />
              </div>
            <div class="top-section">
              <div class="logo-container">
                <img src="${logoUrl}" alt="Hospital Logo" onerror="this.src='/lifecare-logo.jpg'" />
              </div>
              <div class="helpline-circle">
                <span class="helpline-title">Help Line :</span>
                <span class="helpline-number">${settings.helpline || '7016124362'}</span>
              </div>
            </div>
            
            <div class="page-padding">
            ${settings.address ? `<div class="hospital-address-bar">${settings.address}</div>` : ''}
            
            <div class="details-grid">
              <div class="details-item"><span>Patient</span><b>${p.name} (${p.code})</b></div>
              <div class="details-item"><span>Age / Gender</span><b>${p.age} / ${p.gender}</b></div>
              <div class="details-item"><span>Doctor</span><b>${p.doctor}</b></div>
              <div class="details-item"><span>Department</span><b>${p.department}</b></div>
              <div class="details-item"><span>Date</span><b>${new Date(rx.createdAt).toLocaleDateString()}</b></div>
              <div class="details-item"><span>Follow-up</span><b>${rx.followUpDate ? new Date(rx.followUpDate).toLocaleDateString() : '-'}</b></div>
            </div>

          <div style="display: flex; gap: 40px; margin-bottom: 10px; font-size: 14px; font-weight: 500;">
            <div style="flex: 1;"><strong>DISEASE:</strong> ${rx.disease || ''}</div>
            <div style="flex: 1;"><strong>DIAGNOSIS:</strong> ${rx.diagnosis || ''}</div>
          </div>

          <div style="display: flex; gap: 20px; align-items: flex-start;">
            <div style="flex: 7;">
              <div class="rx">Rx</div>
              
              ${medicinesHtml}

              ${rx.suggestion ? `
              <div class="complaint-box" style="margin-bottom: 10px; padding: 10px; min-height: 40px;">
                ${rx.suggestion}
              </div>
              ` : ''}

              <table class="vitals">
                <thead>
                  <tr>
                    <th>INVESTIGATIONS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>-----CBC/CRP/RBS</td></tr>
                  <tr><td style="height: 28px;"></td></tr>
                  <tr><td style="height: 28px;"></td></tr>
                  <tr><td style="color: #e53e3e;">FOLLOW – UP AFTER ${rx.courseDays || 5} DAYS</td></tr>
                </tbody>
              </table>
            </div>

            <div style="flex: 3; padding-top: 45px;">
              <table class="vitals">
                <thead>
                  <tr>
                    <th style="width: 50%;">VITALS</th>
                    <th style="width: 50%;">RESULTS</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>B.P.</td><td></td></tr>
                  <tr><td>PULSE</td><td></td></tr>
                  <tr><td>SPO2</td><td></td></tr>
                  <tr><td>TEMPERATURE</td><td></td></tr>
                </tbody>
              </table>
            </div>
          </div>
          </div>
          </div>
          
          <div class="custom-footer">
            <div class="footer-line"></div>
            <div class="footer-content">
              <div class="footer-text">
                <div class="gujarati-bold">ખાસ નોંધ : દવા ડોકટર સાહેબને બતાવી ને જ લેવી.</div>
                <div class="gujarati-bold" style="padding-left: 50px;">દવાન રિએકશન આવવુ તે દર્દી ના તાસીર ઉપર આધારીત છે.</div>
              </div>
              <div class="emergency-logo-container">
                <img src="/emergency_services.jpg" class="emergency-logo" alt="Emergency Services" />
              </div>
            </div>
          </div>

          </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow!.document.close();
  };

  const updRow = (i: number, patch: Partial<PrescribedMedicine>) => {
    const arr = [...rows];
    arr[i] = { ...arr[i], ...patch };
    setRows(arr);
  };
  const addRow = () => setRows([...rows, emptyRow()]);
  const rmRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i));

  const savePrescription = async () => {
    if (!active) return;
    console.log("savePrescription rows:", rows);
    const meds = rows.filter((r) => r.medicineId);
    console.log("Filtered meds for prescription:", meds);
    if (meds.length === 0) return toast.error("Add at least one medicine");
    const rx = await opdService.createPrescription({
      patientId: active.id,
      diagnosis, disease,
      medicines: meds,
      suggestion,
      followUpDate: followUp || undefined,
      courseDays: course ? Number(course) : undefined,
    });
    await receptionService.updateStatus(active.id, "Completed");
    toast.success("Prescription saved");
    setPrintData({ p: active, rx });
    setActive(null);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">OPD queue</h2>
        <p className="text-sm text-muted-foreground">Search patients and record prescriptions.</p>
      </div>

      <Card className="shadow-[var(--shadow-card)]">
        <CardContent className="p-5 space-y-4">
          <div className="relative max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by patient code or name..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Age/Gender</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPatients.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No patients found.</TableCell></TableRow>
                )}
                {paginatedPatients.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.code}</TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{p.name}</span>
                        {p.isEmergency && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 font-bold tracking-wider">
                            EMERGENCY
                          </Badge>
                        )}
                        {p.isMlc && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-500 text-amber-600 font-bold tracking-wider bg-amber-500/10">
                            MLC
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{p.age} / {p.gender}</TableCell>
                    <TableCell>{p.department}</TableCell>
                    <TableCell>{p.doctor}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{new Date(p.registeredAt).toLocaleDateString()}</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {p.status === "Completed" ? (
                          <Button size="sm" variant="outline" onClick={() => openPrint(p)} className="h-8 gap-1.5 font-medium">
                            <Stethoscope className="h-3.5 w-3.5 text-primary" /> View / Print
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => openPrescribe(p)} className="h-8 gap-1.5 font-medium">
                            <Stethoscope className="h-3.5 w-3.5" /> Prescribe
                          </Button>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline" className="h-8 gap-1 px-2.5 font-medium" title="Print options">
                              <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>Print</span>
                              <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem
                              onClick={() => handlePrintReceipt(p, db.hospitalSettings)}
                              className="cursor-pointer gap-2 py-2"
                            >
                              <Receipt className="h-4 w-4 text-emerald-600" />
                              <div className="flex flex-col text-left">
                                <span className="font-medium text-xs">Registration Receipt</span>
                                <span className="text-[10px] text-muted-foreground">A4 Consultation Receipt</span>
                              </div>
                            </DropdownMenuItem>

                            {p.status === "Completed" && (
                              <DropdownMenuItem
                                onClick={() => openPrint(p)}
                                className="cursor-pointer gap-2 py-2"
                              >
                                <FileText className="h-4 w-4 text-blue-600" />
                                <div className="flex flex-col text-left">
                                  <span className="font-medium text-xs">Prescription</span>
                                  <span className="text-[10px] text-muted-foreground">Medicines &amp; Advice</span>
                                </div>
                              </DropdownMenuItem>
                            )}

                            {p.isEmergency && (
                              <DropdownMenuItem
                                onClick={() => handlePrintEmergency(p, db.hospitalSettings)}
                                className="cursor-pointer gap-2 py-2 text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                              >
                                <AlertCircle className="h-4 w-4 text-rose-600" />
                                <div className="flex flex-col text-left">
                                  <span className="font-medium text-xs">Emergency Form</span>
                                  <span className="text-[10px] text-rose-500/80">Clinical Emergency Sheet</span>
                                </div>
                              </DropdownMenuItem>
                            )}

                            {p.isMlc && (
                              <DropdownMenuItem
                                onClick={() => handlePrintMlc(p, db.hospitalSettings)}
                                className="cursor-pointer gap-2 py-2 text-amber-600 focus:text-amber-600 focus:bg-amber-50"
                              >
                                <FileCheck className="h-4 w-4 text-amber-600" />
                                <div className="flex flex-col text-left">
                                  <span className="font-medium text-xs">M.L.C. Form</span>
                                  <span className="text-[10px] text-amber-500/80">Medico-Legal Record</span>
                                </div>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(p.id)}
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 ml-0.5"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Grid View - Compact Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:hidden">
            {paginatedPatients.length === 0 && (
              <div className="text-center text-muted-foreground py-8 text-sm col-span-full border rounded-lg bg-muted/20">
                No patients found.
              </div>
            )}
            {paginatedPatients.map((p) => (
              <div
                key={p.id}
                className="rounded-lg border bg-card p-3 shadow-sm hover:border-primary/40 transition-colors flex flex-col justify-between gap-2"
              >
                <div>
                  {/* Top Bar: Code, Date & Status */}
                  <div className="flex items-center justify-between gap-1 text-[11px] text-muted-foreground">
                    <span className="font-mono font-semibold text-primary/90">{p.code}</span>
                    <div className="flex items-center gap-1.5">
                      <span>{new Date(p.registeredAt).toLocaleDateString()}</span>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>

                  {/* Name & Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap mt-1">
                    <span className="font-semibold text-sm text-foreground">{p.name}</span>
                    {p.isEmergency && (
                      <Badge variant="destructive" className="text-[9px] px-1 py-0 h-3.5 font-bold tracking-wider">
                        EMERGENCY
                      </Badge>
                    )}
                    {p.isMlc && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-amber-500 text-amber-600 font-bold tracking-wider bg-amber-500/10">
                        MLC
                      </Badge>
                    )}
                  </div>

                  {/* Demographic & Dept / Doctor */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                    <span>{p.age} / {p.gender}</span>
                    <span className="truncate max-w-[150px]">
                      {p.department}{p.doctor ? ` • ${p.doctor}` : ""}
                    </span>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-border/60 mt-1">
                  <div>
                    {p.status === "Completed" ? (
                      <Button size="sm" variant="outline" onClick={() => openPrint(p)} className="h-7 text-xs px-2.5 gap-1 font-medium">
                        <Stethoscope className="h-3 w-3 text-primary" /> View / Print
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => openPrescribe(p)} className="h-7 text-xs px-2.5 gap-1 font-medium">
                        <Stethoscope className="h-3 w-3" /> Prescribe
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 px-2 font-medium" title="Print options">
                          <Printer className="h-3 w-3 text-muted-foreground" />
                          <span>Print</span>
                          <ChevronDown className="h-2.5 w-2.5 opacity-60" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem
                          onClick={() => handlePrintReceipt(p, db.hospitalSettings)}
                          className="cursor-pointer gap-2 py-2"
                        >
                          <Receipt className="h-4 w-4 text-emerald-600" />
                          <div className="flex flex-col text-left">
                            <span className="font-medium text-xs">Registration Receipt</span>
                            <span className="text-[10px] text-muted-foreground">A4 Consultation Receipt</span>
                          </div>
                        </DropdownMenuItem>

                        {p.status === "Completed" && (
                          <DropdownMenuItem
                            onClick={() => openPrint(p)}
                            className="cursor-pointer gap-2 py-2"
                          >
                            <FileText className="h-4 w-4 text-blue-600" />
                            <div className="flex flex-col text-left">
                              <span className="font-medium text-xs">Prescription</span>
                              <span className="text-[10px] text-muted-foreground">Medicines &amp; Advice</span>
                            </div>
                          </DropdownMenuItem>
                        )}

                        {p.isEmergency && (
                          <DropdownMenuItem
                            onClick={() => handlePrintEmergency(p, db.hospitalSettings)}
                            className="cursor-pointer gap-2 py-2 text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                          >
                            <AlertCircle className="h-4 w-4 text-rose-600" />
                            <div className="flex flex-col text-left">
                              <span className="font-medium text-xs">Emergency Form</span>
                              <span className="text-[10px] text-rose-500/80">Clinical Emergency Sheet</span>
                            </div>
                          </DropdownMenuItem>
                        )}

                        {p.isMlc && (
                          <DropdownMenuItem
                            onClick={() => handlePrintMlc(p, db.hospitalSettings)}
                            className="cursor-pointer gap-2 py-2 text-amber-600 focus:text-amber-600 focus:bg-amber-50"
                          >
                            <FileCheck className="h-4 w-4 text-amber-600" />
                            <div className="flex flex-col text-left">
                              <span className="font-medium text-xs">M.L.C. Form</span>
                              <span className="text-[10px] text-amber-500/80">Medico-Legal Record</span>
                            </div>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(p.id)}
                      className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {totalPages > 1 && (
            <div className="pt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"} 
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <span className="text-sm text-muted-foreground mx-4">Page {currentPage} of {totalPages}</span>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!active} onOpenChange={(v) => !v && setActive(null)}>
        <DialogContent className="w-[96vw] sm:max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader><DialogTitle>Prescribe — {active?.name}</DialogTitle></DialogHeader>
          {active && (
            <div className="space-y-5">
              <div className="grid sm:grid-cols-3 gap-3 rounded-lg bg-muted/40 p-4 text-sm">
                <Info k="Code" v={active.code} />
                <Info k="Age / Gender" v={`${active.age} / ${active.gender}`} />
                <Info k="Department" v={active.department} />
                <Info k="Doctor" v={active.doctor} />
                <Info k="Phone" v={active.phone} />
                <Info k="Visit" v={active.type} />
                {/* @ts-ignore - assuming complaint is dynamically present */}
                {active.complaint && (
                  <div className="sm:col-span-3 mt-1 pt-3 border-t">
                    <Info k="Complaint" v={active.complaint} />
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <FieldWrap label="Diagnosis"><Textarea rows={2} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} /></FieldWrap>
                <FieldWrap label="Disease / Condition"><Textarea rows={2} value={disease} onChange={(e) => setDisease(e.target.value)} /></FieldWrap>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Medicines</h3>
                  <Button variant="outline" size="sm" onClick={addRow}><Plus className="h-4 w-4 mr-1" /> Add row</Button>
                </div>
                <div className="rounded-lg border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[45%]">Medicine</TableHead>
                        <TableHead className="text-center">M</TableHead>
                        <TableHead className="text-center">A</TableHead>
                        <TableHead className="text-center">E</TableHead>
                        <TableHead className="text-center">N</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r, i) => {
                        const m = db.medicines.find(x => x.id === r.medicineId);
                        const cat = m ? db.categories.find(c => c.id === m.categoryId) : null;
                        const isSyrup = cat?.name.toLowerCase() === "syrup";

                        return (
                          <TableRow key={i}>
                            <TableCell>
                              <MedicineAutocomplete 
                                value={r.medicineId}
                                selectedName={r.name}
                                onSelect={(id, name) => updRow(i, { medicineId: id, name })}
                              />
                            </TableCell>
                            {(["morning", "afternoon", "evening", "night"] as const).map((slot) => (
                              <TableCell key={slot} className="text-center">
                                {isSyrup ? (
                                  <Input 
                                    placeholder="ml" 
                                    value={r[slot]} 
                                    onChange={(e) => updRow(i, { [slot]: e.target.value })} 
                                    className="w-16 mx-auto text-center h-8"
                                  />
                                ) : (
                                  <Checkbox 
                                    checked={r[slot] === "true"} 
                                    onCheckedChange={(v) => updRow(i, { [slot]: v ? "true" : "false" })} 
                                  />
                                )}
                              </TableCell>
                            ))}
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => rmRow(i)}><Trash2 className="h-4 w-4" /></Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <FieldWrap label="Suggestions / Notes"><Textarea rows={3} value={suggestion} onChange={(e) => setSuggestion(e.target.value)} /></FieldWrap>

              <div className="grid sm:grid-cols-2 gap-4">
                <FieldWrap label="Follow-up date"><Input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} /></FieldWrap>
                <FieldWrap label="Course duration (days)"><Input type="number" value={course} onChange={(e) => setCourse(e.target.value)} /></FieldWrap>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setActive(null)}>Cancel</Button>
                <Button onClick={savePrescription}>Save prescription</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!printData} onOpenChange={(v) => !v && setPrintData(null)}>
        <DialogContent className="w-[96vw] sm:max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader><DialogTitle>Prescription</DialogTitle></DialogHeader>
          {printData && <PrescriptionPrint p={printData.p} rx={printData.rx} hospitalSettings={db.hospitalSettings} />}
          <div className="flex justify-end gap-2 no-print">
            <Button variant="outline" onClick={() => setPrintData(null)}>Close</Button>
            <Button onClick={() => printData && handlePrint(printData.p, printData.rx, db.hospitalSettings)}><Printer className="h-4 w-4 mr-2" /> Print</Button>
          </div>
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the patient and all associated records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600 text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatusBadge({ status }: { status: Patient["status"] }) {
  const map: Record<Patient["status"], string> = {
    Waiting: "bg-warning text-warning-foreground",
    "In Consultation": "bg-info text-info-foreground",
    Completed: "bg-success text-success-foreground",
  };
  return <Badge className={map[status]}>{status}</Badge>;
}
function Info({ k, v }: { k: string; v: string }) {
  return <div><div className="text-xs text-muted-foreground">{k}</div><div className="font-medium">{v}</div></div>;
}
function FieldWrap({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>{children}</div>;
}

function PrescriptionPrint({ p, rx, hospitalSettings }: { p: Patient; rx: Prescription; hospitalSettings: any }) {
  return (
    <div className="print-area space-y-4">
      <div className="border-2 border-dashed rounded-lg p-3 text-center text-xs text-muted-foreground">
        <img src={hospitalSettings.logoUrl || '/lifecare-logo.jpg'} alt="Logo" className="mx-auto max-h-12 mb-2" onError={(e) => { e.currentTarget.src = '/lifecare-logo.jpg'; }} />
        {hospitalSettings.address || "Hospital Letterhead — to be added"}
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Info k="Patient" v={`${p.name} (${p.code})`} />
        <Info k="Age / Gender" v={`${p.age} / ${p.gender}`} />
        <Info k="Doctor" v={p.doctor} />
        <Info k="Department" v={p.department} />
        <Info k="Date" v={new Date(rx.createdAt).toLocaleDateString()} />
        <Info k="Follow-up" v={rx.followUpDate || "—"} />
      </div>
      <div className="grid sm:grid-cols-2 gap-3 border-t pt-3">
        <Info k="Diagnosis" v={rx.diagnosis || "—"} />
        <Info k="Disease" v={rx.disease || "—"} />
      </div>
      <div>
        <h4 className="text-sm font-semibold mb-2">Rx</h4>
        <table className="w-full text-sm border">
          <thead className="bg-muted/50">
            <tr><th className="text-left p-2">Medicine</th><th className="p-2">M</th><th className="p-2">A</th><th className="p-2">E</th><th className="p-2">N</th></tr>
          </thead>
          <tbody>
            {rx.medicines.map((m, i) => {
              const showSlot = (v: string) => {
                if (v === "true") return "1";
                if (v === "false") return "";
                return v;
              };
              return (
                <tr key={i} className="border-t">
                  <td className="p-2">{m.name}</td>
                  <td className="text-center p-2">{showSlot(m.morning)}</td>
                  <td className="text-center p-2">{showSlot(m.afternoon)}</td>
                  <td className="text-center p-2">{showSlot(m.evening)}</td>
                  <td className="text-center p-2">{showSlot(m.night)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rx.suggestion && <div><h4 className="text-sm font-semibold">Suggestions</h4><p className="text-sm text-muted-foreground whitespace-pre-wrap">{rx.suggestion}</p></div>}
      {rx.courseDays && <div className="text-sm">Course duration: <b>{rx.courseDays} days</b></div>}
    </div>
  );
}
