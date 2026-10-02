import { createFileRoute } from "@tanstack/react-router";
import { RequireAuth } from "@/components/RoleGuard";
import { AppShell } from "@/components/AppShell";
import { useState, useRef, useEffect } from "react";
import { type Patient } from "@/lib/store";
import { useDB } from "@/lib/useStore";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Printer, Plus, Trash, FileText } from "lucide-react";
import { apiService } from "@/api/apiService";
import { renderToString } from "react-dom/server";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import numberToWords from "number-to-words";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/billing")({
  component: () => (
    <RequireAuth module="Reception" action="Access">
      <AppShell>
        <BillingRoute />
      </AppShell>
    </RequireAuth>
  ),
});

function BillingRoute() {
  const db = useDB();
  const [q, setQ] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [activePatient, setActivePatient] = useState<Patient | null>(null);
  const [dischargeBillPatient, setDischargeBillPatient] = useState<Patient | null>(null);
  const [labBillPatient, setLabBillPatient] = useState<Patient | null>(null);
  const [finalBillPatient, setFinalBillPatient] = useState<Patient | null>(null);

  const ipdPatients = db.patients.filter(
    (p) =>
      p.type === "IPD" &&
      (!q ||
        p.name.toLowerCase().includes(q.toLowerCase()) ||
        p.code.toLowerCase().includes(q.toLowerCase()))
  );

  const totalPages = Math.ceil(ipdPatients.length / itemsPerPage);
  const paginatedPatients = ipdPatients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Billing & Deposits</h2>
        <p className="text-sm text-muted-foreground">Manage IPD deposits and print deposit receipts.</p>
      </div>

      <Card className="shadow-[var(--shadow-card)]">
        <CardContent className="p-5 space-y-4">
          <div className="relative max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by patient code or name..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Age/Gender</TableHead>
                  <TableHead>Ward</TableHead>
                  <TableHead>Doctor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPatients.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No IPD patients found.
                    </TableCell>
                  </TableRow>
                )}
                {paginatedPatients.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.code}</TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{p.age} / {p.gender}</TableCell>
                    <TableCell>{p.ward || "N/A"}</TableCell>
                    <TableCell>{p.doctor || "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant={(p.status as string) === "Admitted" ? "destructive" : "default"}>
                        {p.status || "Admitted"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setActivePatient(p)} className="text-primary hover:text-primary/80">
                        <FileText className="h-4 w-4 mr-1" /> Deposits
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDischargeBillPatient(p)} className="text-red-600 hover:text-red-800 ml-2">
                        <FileText className="h-4 w-4 mr-1" /> Case Bill
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setLabBillPatient(p)} className="text-orange-600 hover:text-orange-800 ml-2">
                        <FileText className="h-4 w-4 mr-1" /> Lab Bill
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setFinalBillPatient(p)} className="text-purple-600 hover:text-purple-800 ml-2">
                        <FileText className="h-4 w-4 mr-1" /> Final Bill
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex justify-end gap-2 items-center">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {activePatient && (
        <DepositDialog patient={activePatient} onClose={() => setActivePatient(null)} settings={db.hospitalSettings} />
      )}
      {dischargeBillPatient && (
        <IpdCaseBillDialog patient={dischargeBillPatient} onClose={() => setDischargeBillPatient(null)} settings={db.hospitalSettings} />
      )}
      {labBillPatient && (
        <LabBillDialog patient={labBillPatient} onClose={() => setLabBillPatient(null)} settings={db.hospitalSettings} />
      )}
      {finalBillPatient && (
        <FinalBillDialog patient={finalBillPatient} onClose={() => setFinalBillPatient(null)} settings={db.hospitalSettings} />
      )}
    </div>
  );
}

function DepositDialog({ patient, onClose, settings }: { patient: Patient; onClose: () => void; settings: any }) {
  const db = useDB();
  const [items, setItems] = useState<any[]>([{ description: "", receiptNo: "1", charges: 0, totalCharges: 0 }]);
  const [receiptNo, setReceiptNo] = useState(`Rec-${patient.id}-${Date.now().toString().slice(-4)}`);
  const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0]);
  const [dischargeDate, setDischargeDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [printData, setPrintData] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  const fetchHistory = async () => {
    try {
      const data = await apiService.depositReceipts.getByPatientId(patient.id);
      setHistory(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [patient.id]);

  const addItem = () => setItems([...items, { description: "", receiptNo: "", charges: 0, totalCharges: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, val: any) => {
    const newItems = [...items];
    newItems[i] = { ...newItems[i], [field]: val };
    
    // Auto sync charges to totalCharges if not set
    if (field === "charges") {
        newItems[i].totalCharges = val;
    }
    setItems(newItems);
  };

  const finalDepositAmount = items.reduce((sum, it) => sum + (Number(it.totalCharges) || 0), 0);
  // Default values based on the receipt image
  const additionalAmount = 0; 
  const netAmount = finalDepositAmount + additionalAmount;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        patientId: patient.id,
        receiptNo,
        billDate,
        dischargeDate: dischargeDate ? new Date(dischargeDate).toISOString() : null,
        ward: patient.ward || "General",
        bedCategory: patient.wardNumber ? `General/${patient.wardNumber}` : "General",
        finalDepositAmount,
        additionalAmount,
        netAmount,
        items: items.filter(it => it.description.trim() !== "").map(it => ({
            description: it.description,
            itemReceiptNo: it.receiptNo || "0",
            charges: Number(it.charges) || 0,
            totalCharges: Number(it.totalCharges) || 0
        }))
      };

      const res = await apiService.depositReceipts.create(payload);
      toast.success("Deposit saved successfully");
      await fetchHistory();
      setPrintData(res);
    } catch (e: any) {
      toast.error("Failed to save deposit");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
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

    const htmlContent = renderToString(
      <DepositPrintTemplate data={printData} patient={patient} settings={settings} />
    );

    printWindow.document.write(`
      <html>
        <head>
          <title>Deposit Receipt — ${patient.name}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page { margin: 0; }
            body { font-family: system-ui, -apple-system, sans-serif; padding: 0; margin: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            * { box-sizing: border-box; }
            @media print { html, body { width: 210mm; } }
          </style>
        </head>
        <body onload="setTimeout(() => { window.print(); }, 500)">
          ${htmlContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Deposit Receipt for {patient.name}</DialogTitle>
        </DialogHeader>

        {printData ? (
            <div className="space-y-4">
                <div className="border p-4 bg-white text-black overflow-x-auto">
                    <DepositPrintTemplate data={printData} patient={patient} settings={settings} />
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setPrintData(null)}>Back</Button>
                    <Button onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> Print Receipt</Button>
                </div>
            </div>
        ) : (
            <div className="space-y-4">
                {history.length > 0 && (
                    <div className="border rounded-md p-4 bg-muted/20">
                        <h3 className="font-semibold text-sm mb-2">Past Deposits</h3>
                        <div className="space-y-2">
                            {history.map((h, idx) => (
                                <div key={idx} className="flex justify-between items-center p-2 border bg-background rounded text-sm">
                                    <div>
                                        <span className="font-medium">{h.receiptNo}</span> - {new Date(h.billDate).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-semibold text-red-600">₹ {h.finalDepositAmount}</span>
                                        <Button variant="outline" size="sm" onClick={() => setPrintData(h)}>
                                            <Printer className="h-4 w-4 mr-2" /> View
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <h3 className="font-semibold text-sm border-b pb-2">New Deposit</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                        <Label className="text-xs">Receipt No</Label>
                        <Input value={receiptNo} readOnly className="h-8 text-sm bg-muted cursor-not-allowed text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Bill Date</Label>
                        <Input type="date" value={billDate} onChange={e => setBillDate(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Discharge Date (Opt)</Label>
                        <Input type="date" value={dischargeDate} onChange={e => setDischargeDate(e.target.value)} className="h-8 text-sm" />
                    </div>
                </div>

                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">No</TableHead>
                                <TableHead>Deposit Date And Schedule</TableHead>
                                <TableHead className="w-[120px]">Receipt No.</TableHead>
                                <TableHead className="w-[120px]">Charges</TableHead>
                                <TableHead className="w-[120px]">Total Charges</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((it, idx) => (
                                <TableRow key={idx}>
                                    <TableCell>{idx + 1}</TableCell>
                                    <TableCell>
                                        <Input value={it.description} onChange={e => updateItem(idx, "description", e.target.value)} placeholder="e.g. Hospital 1st Deposit" className="h-8" />
                                    </TableCell>
                                    <TableCell>
                                        <Input value={it.receiptNo} onChange={e => updateItem(idx, "receiptNo", e.target.value)} placeholder="0" className="h-8" />
                                    </TableCell>
                                    <TableCell>
                                        <Input type="number" value={it.charges} onChange={e => updateItem(idx, "charges", e.target.value)} className="h-8" />
                                    </TableCell>
                                    <TableCell>
                                        <Input type="number" value={it.totalCharges} onChange={e => updateItem(idx, "totalCharges", e.target.value)} className="h-8" />
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="h-8 w-8 text-red-500 hover:text-red-600"><Trash className="h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <Button variant="outline" size="sm" onClick={addItem} className="w-full"><Plus className="h-4 w-4 mr-2" /> Add Row</Button>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving || items.length === 0}>Save & Generate Receipt</Button>
                </div>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Print Template exactly matching the image provided
const DepositPrintTemplate = ({ data, patient, settings }: any) => {
    return (
        <div className="px-6 py-3 w-full max-w-[800px] mx-auto text-black font-sans" style={{ fontSize: "11px" }}>
            {/* Watermark Logo */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.10] -z-10 pointer-events-none flex justify-center items-center w-full">
                {settings?.logoUrl && <img src={settings.logoUrl} alt="Watermark" className="w-[80%] max-w-[600px] object-contain -rotate-12" />}
            </div>

            {/* Main Content Wrapper for z-index */}
            <div className="relative">
                {/* Header Section */}
            <div className="bg-[#4b4b4b] mx-3 mt-3 mb-4 rounded-[40px] flex items-center justify-between h-[100px] relative">
              <div className="bg-white h-full w-[calc(100%-180px)] rounded-l-[40px] flex items-center justify-start p-0 box-border">
                {settings?.logoUrl && <img src={settings.logoUrl} alt="Hospital Logo" className="w-full h-full rounded-l-[40px] object-fill" />}
              </div>
              <div className="bg-white w-[150px] h-[150px] rounded-full absolute right-5 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center text-center shadow-[0_4px_10px_rgba(0,0,0,0.15)] z-10">
                <span className="text-sm mb-1 text-[#e53e3e]">Help Line :</span>
                <span className="text-lg font-bold text-[#e53e3e]">{settings?.helpline || 'N/A'}</span>
              </div>
            </div>

            {/* Patient Info & Receipt Details */}
            <div className="border border-black p-2 text-[11px] mb-6 uppercase flex flex-row">
                {/* Left side: Patient Info */}
                <div className="w-2/3 pr-4 border-r border-gray-400 space-y-2">
                    <div className="flex gap-4">
                        <div className="flex-1 border-b border-dotted border-gray-400 pb-1">Pt.NAME - <span className="font-semibold">{patient.name}</span></div>
                        <div className="w-48 border-b border-dotted border-gray-400 pb-1">AGE / GENDER - <span className="font-semibold">{patient.age} / {patient.gender}</span></div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1 border-b border-dotted border-gray-400 pb-1">Dr. IN-CHARGE - <span className="font-semibold">{patient.doctor || ""}</span></div>
                        <div className="w-48 border-b border-dotted border-gray-400 pb-1">ADDMITION - <span className="font-semibold">{new Date(patient.registeredAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</span></div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1 border-b border-dotted border-gray-400 pb-1">ADDRESH - <span className="font-semibold">{patient.city}</span></div>
                        <div className="w-48 border-b border-dotted border-gray-400 pb-1">DISEASE - </div>
                    </div>
                </div>
                {/* Right side: Admission / Receipt Info */}
                <div className="w-1/3 pl-4 text-[10px] leading-tight space-y-1">
                    <div className="grid grid-cols-[100px_1fr]"><span className="text-gray-500">Admission No</span> <span>- {patient.code}</span></div>
                    <div className="grid grid-cols-[100px_1fr]"><span className="text-gray-500">Indoor No</span> <span>- {patient.code}</span></div>
                    <div className="grid grid-cols-[100px_1fr]"><span className="text-gray-500">RECEIPT No</span> <span>- {data.receiptNo}</span></div>
                    <div className="grid grid-cols-[100px_1fr]"><span className="text-gray-500">Bill Date</span> <span>- {new Date(data.billDate).toLocaleDateString('en-GB')}</span></div>
                    <div className="grid grid-cols-[100px_1fr]"><span className="text-gray-500">Discharge Date</span> <span>- {data.dischargeDate ? new Date(data.dischargeDate).toLocaleDateString('en-GB') : "Pending"}</span></div>
                    <div className="grid grid-cols-[100px_1fr]"><span className="text-gray-500">Ward</span> <span>- {data.ward}</span></div>
                    <div className="grid grid-cols-[100px_1fr]"><span className="text-gray-500">Bed Category</span> <span>- {data.bedCategory}</span></div>
                </div>
            </div>

            {/* Title */}
            {/* Title */}
            <div className="text-center font-bold text-red-600 text-lg mb-2 underline tracking-wider">
                DEPOSIT RECEIPT
            </div>

            {/* Table */}
            <div className="border border-black mb-2">
                <table className="w-full text-[11px]">
                    <thead>
                        <tr className="border-b border-black text-red-600">
                            <th className="w-10 border-r border-black py-1 text-left px-2 font-normal">NO</th>
                            <th className="border-r border-black py-1 text-left px-2 font-normal">Deposit Date And Schedule</th>
                            <th className="w-24 border-r border-black py-1 text-center px-2 font-normal">Receipt No.</th>
                            <th className="w-24 border-r border-black py-1 text-right px-2 font-normal">Charges</th>
                            <th className="w-28 py-1 text-right px-2 font-normal">Total Charges</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.items.map((it: any, idx: number) => (
                            <tr key={idx}>
                                <td className="border-r border-black px-2 py-1 align-top">{idx + 1}</td>
                                <td className="border-r border-black px-2 py-1 font-semibold">{it.description}</td>
                                <td className="border-r border-black px-2 py-1 text-center">{it.itemReceiptNo}</td>
                                <td className="border-r border-black px-2 py-1 text-right">{it.charges.toLocaleString('en-IN')}</td>
                                <td className="px-2 py-1 text-right">{it.totalCharges.toLocaleString('en-IN')}</td>
                            </tr>
                        ))}
                        {/* Minimum height filler rows */}
                        {[...Array(Math.max(0, 3 - data.items.length))].map((_, i) => (
                            <tr key={`empty-${i}`}>
                                <td className="border-r border-black px-2 py-2"></td>
                                <td className="border-r border-black px-2 py-2"></td>
                                <td className="border-r border-black px-2 py-2"></td>
                                <td className="border-r border-black px-2 py-2"></td>
                                <td className="px-2 py-2"></td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="border-t border-black font-semibold">
                        <tr>
                            <td colSpan={2} className="px-2 py-2 border-r border-black">
                                Final Deposit Amount
                            </td>
                            <td className="border-r border-black text-center">=</td>
                            <td colSpan={2} className="px-2 py-2 text-right">
                                {data.finalDepositAmount.toLocaleString('en-IN')} /-
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* In Words */}
            <div className="border border-black p-1.5 text-[11px] mb-4">
                In Words — {numberToWords.toWords(data.finalDepositAmount)} Only.
            </div>

            {/* Bank Details & Totals */}
            <div className="flex border border-black text-[11px] mb-2">
                <div className="w-1/2 border-r border-black p-2 space-y-1 text-red-600">
                    <div className="uppercase">BANK DETAILS</div>
                    <div>Account Name — {settings?.bankAccountName}</div>
                    <div>A / C No — {settings?.bankAccountNumber}</div>
                    <div className="uppercase">BANK NAME — {settings?.bankName}</div>
                    <div>IFSE Coad — {settings?.bankIfscCode}</div>
                </div>
                <div className="w-1/2 p-2 flex flex-col justify-center space-y-2 text-red-600 font-semibold">
                    <div className="flex justify-between">
                        <span>Deposit Amount</span>
                        <span>=</span>
                        <span className="w-24 text-right">{data.finalDepositAmount.toLocaleString('en-IN')} /-</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Additional Amount</span>
                        <span>=</span>
                        <span className="w-24 text-right">{data.additionalAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between border-t border-red-600 pt-1 mt-1">
                        <span>Net Amount</span>
                        <span>=</span>
                        <span className="w-24 text-right">{data.netAmount.toLocaleString('en-IN')} /-</span>
                    </div>
                </div>
            </div>

            {/* Net Amount In Words */}
            <div className="border border-black p-1.5 text-[11px] mb-4">
                Amount In Words — {numberToWords.toWords(data.netAmount)} Only.
            </div>

            {/* Signatures */}
            <div className="flex justify-between px-8 text-[11px] font-semibold underline underline-offset-4">
                <div>RELATIVE / PATIENT SIGNETURE</div>
                <div>AUTHORISED SIGNATURE</div>
            </div>
            </div>
        </div>
    );
};

function IpdCaseBillDialog({ patient, onClose, settings }: { patient: Patient; onClose: () => void; settings: any }) {
  const db = useDB();
  const [items, setItems] = useState<any[]>([{ description: "", itemReceiptNo: "1", charges: 0, totalCharges: 0 }]);
  const [receiptNo, setReceiptNo] = useState(`IPD-${patient.id}-${Date.now().toString().slice(-4)}`);
  const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0]);
  const [dischargeDate, setDischargeDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [printData, setPrintData] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [totalDeposits, setTotalDeposits] = useState(0);

  const fetchHistory = async () => {
    try {
      const data = await apiService.ipdCaseBills.getByPatientId(patient.id);
      setHistory(data || []);
      
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [patient.id]);

  const addItem = () => setItems([...items, { description: "", itemReceiptNo: "1", charges: 0, totalCharges: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, val: any) => {
    const newItems = [...items];
    newItems[i] = { ...newItems[i], [field]: val };
    
    if (field === "description") {
        const charge = db.charges.find(c => c.name === val);
        if (charge) {
            newItems[i].charges = charge.amount;
            newItems[i].totalCharges = charge.amount * (Number(newItems[i].itemReceiptNo) || 1);
        }
    } else if (field === "itemReceiptNo") {
        newItems[i].totalCharges = (Number(newItems[i].charges) || 0) * (Number(val) || 1);
    } else if (field === "charges") {
        newItems[i].totalCharges = (Number(val) || 0) * (Number(newItems[i].itemReceiptNo) || 1);
    }
    setItems(newItems);
  };

  const finalDepositAmount = items.reduce((sum, it) => sum + (Number(it.totalCharges) || 0), 0);
  const discountAmount = 0; 
  const netAmount = finalDepositAmount - totalDeposits - discountAmount;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        patientId: patient.id,
        receiptNo,
        billDate,
        dischargeDate: dischargeDate ? new Date(dischargeDate).toISOString() : null,
        ward: patient.ward || "General",
        bedCategory: patient.wardNumber ? `General/${patient.wardNumber}` : "General",
        totalAmount: finalDepositAmount,
        depositAmount: totalDeposits,
        discountAmount: discountAmount,
        netAmount,
        items: items.filter(it => it.description.trim() !== "").map(it => ({
            description: it.description,
            daysQty: Number(it.itemReceiptNo) || 1,
            charges: Number(it.charges) || 0,
            totalCharges: Number(it.totalCharges) || 0
        }))
      };

      const res = await apiService.ipdCaseBills.create(payload);
      toast.success("Case Bill saved successfully");
      await fetchHistory();
      setPrintData(res);
    } catch (e: any) {
      toast.error("Failed to save Case Bill");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
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

    const htmlContent = renderToString(
      <IpdCaseBillPrintTemplate data={printData} patient={patient} settings={settings} />
    );

    printWindow.document.write(`
      <html>
        <head>
          <title>IPD Case Bill — ${patient.name}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page { margin: 0; }
            body { font-family: system-ui, -apple-system, sans-serif; padding: 0; margin: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            * { box-sizing: border-box; }
            @media print { html, body { width: 210mm; } }
          </style>
        </head>
        <body onload="setTimeout(() => { window.print(); }, 500)">
          ${htmlContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>IPD Case Bill for {patient.name}</DialogTitle>
        </DialogHeader>

        {printData ? (
            <div className="space-y-4">
                <div className="border p-4 bg-white text-black overflow-x-auto">
                    <IpdCaseBillPrintTemplate data={printData} patient={patient} settings={settings} />
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setPrintData(null)}>Back</Button>
                    <Button onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> Print Bill</Button>
                </div>
            </div>
        ) : (
            <div className="space-y-4">
                {history.length > 0 && (
                    <div className="border rounded-md p-4 bg-muted/20">
                        <h3 className="font-semibold text-sm mb-2">Past Case Bills</h3>
                        <div className="space-y-2">
                            {history.map((h, idx) => (
                                <div key={idx} className="flex justify-between items-center p-2 border bg-background rounded text-sm">
                                    <div>
                                        <span className="font-medium">{h.receiptNo}</span> - {new Date(h.billDate).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-semibold text-red-600">₹ {h.netAmount}</span>
                                        <Button variant="outline" size="sm" onClick={() => setPrintData(h)}>
                                            <Printer className="h-4 w-4 mr-2" /> View
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <h3 className="font-semibold text-sm border-b pb-2">New Case Bill</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                        <Label className="text-xs">Receipt No</Label>
                        <Input value={receiptNo} readOnly className="h-8 text-sm bg-muted cursor-not-allowed text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Bill Date</Label>
                        <Input type="date" value={billDate} onChange={e => setBillDate(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Discharge Date (Opt)</Label>
                        <Input type="date" value={dischargeDate} onChange={e => setDischargeDate(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Less: Deposit</Label>
                        <Input value={totalDeposits} readOnly className="h-8 text-sm bg-muted cursor-not-allowed text-red-600 font-semibold" />
                    </div>
                </div>

                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">No</TableHead>
                                <TableHead>Particular Procedure</TableHead>
                                <TableHead className="w-[120px]">Days / Qty</TableHead>
                                <TableHead className="w-[120px]">Charges</TableHead>
                                <TableHead className="w-[120px]">Total Charges</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((it, idx) => (
                                <TableRow key={idx}>
                                    <TableCell>{idx + 1}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Select value={it.description} onValueChange={v => updateItem(idx, "description", v)}>
                                                <SelectTrigger className="h-8 flex-1">
                                                    <SelectValue placeholder="Select procedure" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {db.charges.filter(c => !c.category || c.category === "Hospital Bill").map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <Input value={it.description} onChange={e => updateItem(idx, "description", e.target.value)} placeholder="Custom..." className="h-8 w-1/3 hidden" />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Input type="number" value={it.itemReceiptNo} onChange={e => updateItem(idx, "itemReceiptNo", e.target.value)} placeholder="1" className="h-8" />
                                    </TableCell>
                                    <TableCell>
                                        <Input type="number" value={it.charges} onChange={e => updateItem(idx, "charges", e.target.value)} className="h-8" />
                                    </TableCell>
                                    <TableCell>
                                        <Input type="number" value={it.totalCharges} onChange={e => updateItem(idx, "totalCharges", e.target.value)} className="h-8" />
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="h-8 w-8 text-red-500 hover:text-red-600"><Trash className="h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <Button variant="outline" size="sm" onClick={addItem} className="w-full"><Plus className="h-4 w-4 mr-2" /> Add Row</Button>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving || items.length === 0}>Save & Generate Bill</Button>
                </div>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const IpdCaseBillPrintTemplate = ({ data, patient, settings }: any) => {
    return (
        <div className="px-6 py-3 w-full max-w-[800px] mx-auto text-black font-sans relative z-0" style={{ fontSize: "11px" }}>
            {/* Watermark Logo */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.10] -z-10 pointer-events-none flex justify-center items-center w-full">
                {settings?.logoUrl && <img src={settings.logoUrl} alt="Watermark" className="w-[80%] max-w-[600px] object-contain -rotate-12" />}
            </div>

            {/* Main Content Wrapper for z-index */}
            <div className="relative">
                {/* Header Section */}
            <div className="bg-[#4b4b4b] mx-5 mt-5 mb-8 rounded-[40px] flex items-center justify-between h-[120px] relative print:bg-[#4b4b4b] print:border print:border-black">
              <div className="bg-white h-full w-[calc(100%-180px)] rounded-l-[40px] flex items-center justify-start p-0 box-border border border-black print:border-black">
                {settings?.logoUrl && <img src={settings.logoUrl} alt="Hospital Logo" className="w-full h-full rounded-l-[40px] object-fill" />}
              </div>
              <div className="bg-white w-[150px] h-[150px] rounded-full absolute right-5 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center text-center shadow-[0_4px_10px_rgba(0,0,0,0.15)] z-10 border border-black print:border-black">
                <span className="text-sm mb-1 text-[#e53e3e]">Help Line :</span>
                <span className="text-lg font-bold text-[#e53e3e]">{settings?.helpline || 'N/A'}</span>
              </div>
            </div>

            {/* Patient Info & Receipt Details */}
            <div className="border border-black p-2 text-[11px] mb-6 uppercase flex flex-row relative z-10 bg-transparent">
                {/* Left side: Patient Info */}
                <div className="w-2/3 pr-4 border-r border-black space-y-2 text-black">
                    <div className="flex gap-4">
                        <div className="flex-1 border-b border-dotted border-black pb-1">Pt.NAME - <span className="font-semibold">{patient.name}</span></div>
                        <div className="w-48 border-b border-dotted border-black pb-1">AGE / GENDER - <span className="font-semibold">{patient.age} / {patient.gender}</span></div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1 border-b border-dotted border-black pb-1">Dr. IN-CHARGE - <span className="font-semibold">{patient.doctor || ""}</span></div>
                        <div className="w-48 border-b border-dotted border-black pb-1">ADDMITION - <span className="font-semibold">{new Date(patient.registeredAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</span></div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1 border-b border-dotted border-black pb-1">ADDRESH - <span className="font-semibold">{patient.city}</span></div>
                        <div className="w-48 border-b border-dotted border-black pb-1">DISEASE - </div>
                    </div>
                </div>
                {/* Right side: Admission / Receipt Info */}
                <div className="w-1/3 pl-4 text-[10px] leading-tight space-y-1 text-black font-semibold">
                    <div className="grid grid-cols-[100px_1fr]"><span className="text-black">Admission No</span> <span>- {patient.code}</span></div>
                    <div className="grid grid-cols-[100px_1fr]"><span className="text-black">Indoor No</span> <span>- {patient.code}</span></div>
                    <div className="grid grid-cols-[100px_1fr]"><span className="text-black">RECEIPT No</span> <span>- {data.receiptNo}</span></div>
                    <div className="grid grid-cols-[100px_1fr]"><span className="text-black">Bill Date</span> <span>- {new Date(data.billDate).toLocaleDateString('en-GB')}</span></div>
                    <div className="grid grid-cols-[100px_1fr]"><span className="text-black">Discharge Date</span> <span>- {data.dischargeDate ? new Date(data.dischargeDate).toLocaleDateString('en-GB') : "Pending"}</span></div>
                    <div className="grid grid-cols-[100px_1fr]"><span className="text-black">Ward</span> <span>- {data.ward}</span></div>
                    <div className="grid grid-cols-[100px_1fr]"><span className="text-black">Bed Category</span> <span>- {data.bedCategory}</span></div>
                </div>
            </div>

            {/* Title */}
            <div className="text-center font-bold text-red-600 text-[13px] py-1 mb-2 tracking-wider border border-black bg-transparent">
                IPD CASE BILL
            </div>

            {/* Table */}
            <div className="border border-black mb-2 relative z-10 bg-transparent text-black">
                <table className="w-full text-[11px] border-collapse bg-transparent text-black border border-black print:border-black">
                    <thead>
                        <tr className="text-red-600 border-b border-black">
                            <th className="w-10 py-1 text-left px-2 font-normal border-r border-black print:border-black">NO</th>
                            <th className="py-1 text-left px-2 font-normal border-r border-black print:border-black">Particular Procedure</th>
                            <th className="w-24 py-1 text-center px-2 font-normal border-r border-black print:border-black">Days / Qty</th>
                            <th className="w-24 py-1 text-center px-2 font-normal border-r border-black print:border-black">Charges</th>
                            <th className="w-28 py-1 text-center px-2 font-normal">Total Charges</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.items.map((it: any, idx: number) => (
                            <tr key={idx}>
                                <td className="px-2 py-1 align-top text-black print:text-black border-r border-black print:border-black underline">{idx + 1}</td>
                                <td className="px-2 py-1 font-semibold text-black print:text-black border-r border-black print:border-black">{it.description}</td>
                                <td className="px-2 py-1 text-center text-black print:text-black border-r border-black print:border-black">{it.daysQty}</td>
                                <td className="px-2 py-1 text-center text-black print:text-black border-r border-black print:border-black">{it.charges}</td>
                                <td className="px-2 py-1 text-center text-black print:text-black">{it.totalCharges}</td>
                            </tr>
                        ))}
                        {/* Minimum height filler rows */}
                        {[...Array(Math.max(0, 8 - data.items.length))].map((_, i) => (
                            <tr key={`empty-${i}`}>
                                <td className="px-2 py-3 border-r border-black print:border-black"></td>
                                <td className="px-2 py-3 border-r border-black print:border-black"></td>
                                <td className="px-2 py-3 border-r border-black print:border-black"></td>
                                <td className="px-2 py-3 border-r border-black print:border-black"></td>
                                <td className="px-2 py-3"></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals Section */}
            <div className="flex border border-black mb-2 text-[11px] relative z-10 bg-transparent">
                <div className="w-1/2 p-2 border-r border-black space-y-1 text-red-600 print:text-red-600">
                    <div className="font-bold mb-1 uppercase text-black">Bank Details</div>
                    <div className="grid grid-cols-[110px_1fr]"><span>Account Name</span> <span>— {settings?.bankAccountName || 'Lifecare Hospital'}</span></div>
                    <div className="grid grid-cols-[110px_1fr]"><span>A / C No</span> <span>— {settings?.bankAccountNumber || '-'}</span></div>
                    <div className="grid grid-cols-[110px_1fr]"><span>BANK NAME</span> <span>— {settings?.bankName || '-'}</span></div>
                    <div className="grid grid-cols-[110px_1fr]"><span>IFSE Code</span> <span>— {settings?.bankIfscCode || '-'}</span></div>
                </div>
                <div className="w-1/2 p-2 flex flex-col justify-center space-y-2 text-red-600 font-bold print:text-red-600">
                    <div className="flex justify-between items-center pr-4">
                        <span>Total Amount</span>
                        <span>=</span>
                        <span className="w-24 text-right">{data.totalAmount.toLocaleString('en-IN')} /-</span>
                    </div>
                    <div className="flex justify-between items-center pr-4">
                        <span>Less : Deposit</span>
                        <span>=</span>
                        <span className="w-24 text-right">{data.depositAmount > 0 ? data.depositAmount.toLocaleString('en-IN') : "-"}</span>
                    </div>
                    <div className="flex justify-between items-center pr-4">
                        <span>Discount Amount</span>
                        <span>=</span>
                        <span className="w-24 text-right">{data.discountAmount > 0 ? data.discountAmount.toLocaleString('en-IN') : "-"}</span>
                    </div>
                    <div className="flex justify-between items-center pr-4 pt-2 border-t border-red-200 print:border-red-600">
                        <span>Net Amount</span>
                        <span>=</span>
                        <span className="w-24 text-right text-lg">{data.netAmount.toLocaleString('en-IN')} /-</span>
                    </div>
                </div>
            </div>
            
            <div className="border border-black p-2 text-[11px] font-semibold mb-6 text-black relative z-10 bg-transparent">
                Amount In Words — <span className="font-normal capitalize text-black">{numberToWords.toWords(data.netAmount)} Only.</span>
            </div>

            {/* Signatures */}
            <div className="flex justify-between mt-16 px-4 text-[11px] font-semibold text-black">
                <div className="border-b border-black pb-1 px-4 text-black">RELATIVE / PATIENT SIGNETURE</div>
                <div className="border-b border-black pb-1 px-4 text-black">AUTHORISED SIGNATURE</div>
            </div>
            </div>
        </div>
    );
};


function LabBillDialog({ patient, onClose, settings }: { patient: Patient; onClose: () => void; settings: any }) {
  const db = useDB();
  const [items, setItems] = useState<any[]>([{ description: "", itemReceiptNo: "1", charges: 0, totalCharges: 0 }]);
  const [receiptNo, setReceiptNo] = useState(`IPD-${patient.id}-${Date.now().toString().slice(-4)}`);
  const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0]);
  const [dischargeDate, setDischargeDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [printData, setPrintData] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  

  const fetchHistory = async () => {
    try {
      const data = await apiService.labBills.getByPatientId(patient.id);
      setHistory(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [patient.id]);

  const addItem = () => setItems([...items, { description: "", itemReceiptNo: "1", charges: 0, totalCharges: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, val: any) => {
    const newItems = [...items];
    newItems[i] = { ...newItems[i], [field]: val };
    
    if (field === "description") {
        const charge = db.charges.find(c => c.name === val);
        if (charge) {
            newItems[i].charges = charge.amount;
            newItems[i].totalCharges = charge.amount * (Number(newItems[i].itemReceiptNo) || 1);
        }
    } else if (field === "itemReceiptNo") {
        newItems[i].totalCharges = (Number(newItems[i].charges) || 0) * (Number(val) || 1);
    } else if (field === "charges") {
        newItems[i].totalCharges = (Number(val) || 0) * (Number(newItems[i].itemReceiptNo) || 1);
    }
    setItems(newItems);
  };

  const finalDepositAmount = items.reduce((sum, it) => sum + (Number(it.totalCharges) || 0), 0);
  const discountAmount = 0; 
  const netAmount = finalDepositAmount - discountAmount;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        patientId: patient.id,
        receiptNo,
        billDate,
        dischargeDate: dischargeDate ? new Date(dischargeDate).toISOString() : null,
        ward: patient.ward || "General",
        bedCategory: patient.wardNumber ? `General/${patient.wardNumber}` : "General",
        totalAmount: finalDepositAmount,
        
        discountAmount: discountAmount,
        netAmount,
        items: items.filter(it => it.description.trim() !== "").map(it => ({
            description: it.description,
            daysQty: Number(it.itemReceiptNo) || 1,
            charges: Number(it.charges) || 0,
            totalCharges: Number(it.totalCharges) || 0
        }))
      };

      const res = await apiService.labBills.create(payload);
      toast.success("Case Bill saved successfully");
      await fetchHistory();
      setPrintData(res);
    } catch (e: any) {
      toast.error("Failed to save Case Bill");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
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

    const htmlContent = renderToString(
      <LabBillPrintTemplate data={printData} patient={patient} settings={settings} />
    );

    printWindow.document.write(`
      <html>
        <head>
          <title>IPD Case Bill — ${patient.name}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page { margin: 0; }
            body { font-family: system-ui, -apple-system, sans-serif; padding: 0; margin: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            * { box-sizing: border-box; }
            @media print { html, body { width: 210mm; } }
          </style>
        </head>
        <body onload="setTimeout(() => { window.print(); }, 500)">
          ${htmlContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>IPD Case Bill for {patient.name}</DialogTitle>
        </DialogHeader>

        {printData ? (
            <div className="space-y-4">
                <div className="border p-4 bg-white text-black overflow-x-auto">
                    <LabBillPrintTemplate data={printData} patient={patient} settings={settings} />
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setPrintData(null)}>Back</Button>
                    <Button onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> Print Bill</Button>
                </div>
            </div>
        ) : (
            <div className="space-y-4">
                {history.length > 0 && (
                    <div className="border rounded-md p-4 bg-muted/20">
                        <h3 className="font-semibold text-sm mb-2">Past Case Bills</h3>
                        <div className="space-y-2">
                            {history.map((h, idx) => (
                                <div key={idx} className="flex justify-between items-center p-2 border bg-background rounded text-sm">
                                    <div>
                                        <span className="font-medium">{h.receiptNo}</span> - {new Date(h.billDate).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-semibold text-red-600">₹ {h.netAmount}</span>
                                        <Button variant="outline" size="sm" onClick={() => setPrintData(h)}>
                                            <Printer className="h-4 w-4 mr-2" /> View
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <h3 className="font-semibold text-sm border-b pb-2">New Case Bill</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                        <Label className="text-xs">Receipt No</Label>
                        <Input value={receiptNo} readOnly className="h-8 text-sm bg-muted cursor-not-allowed text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Bill Date</Label>
                        <Input type="date" value={billDate} onChange={e => setBillDate(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Discharge Date (Opt)</Label>
                        <Input type="date" value={dischargeDate} onChange={e => setDischargeDate(e.target.value)} className="h-8 text-sm" />
                    </div>
                </div>

                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">No</TableHead>
                                <TableHead>Particular Procedure</TableHead>
                                <TableHead className="w-[120px]">Days / Qty</TableHead>
                                <TableHead className="w-[120px]">Charges</TableHead>
                                <TableHead className="w-[120px]">Total Charges</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((it, idx) => (
                                <TableRow key={idx}>
                                    <TableCell>{idx + 1}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Select value={it.description} onValueChange={v => updateItem(idx, "description", v)}>
                                                <SelectTrigger className="h-8 flex-1">
                                                    <SelectValue placeholder="Select procedure" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {db.charges.filter(c => c.category === "Lab Bill").map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                            <Input value={it.description} onChange={e => updateItem(idx, "description", e.target.value)} placeholder="Custom..." className="h-8 w-1/3 hidden" />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Input type="number" value={it.itemReceiptNo} onChange={e => updateItem(idx, "itemReceiptNo", e.target.value)} placeholder="1" className="h-8" />
                                    </TableCell>
                                    <TableCell>
                                        <Input type="number" value={it.charges} onChange={e => updateItem(idx, "charges", e.target.value)} className="h-8" />
                                    </TableCell>
                                    <TableCell>
                                        <Input type="number" value={it.totalCharges} onChange={e => updateItem(idx, "totalCharges", e.target.value)} className="h-8" />
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="h-8 w-8 text-red-500 hover:text-red-600"><Trash className="h-4 w-4" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <Button variant="outline" size="sm" onClick={addItem} className="w-full"><Plus className="h-4 w-4 mr-2" /> Add Row</Button>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving || items.length === 0}>Save & Generate Bill</Button>
                </div>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const LabBillPrintTemplate = ({ data, patient, settings }: any) => {
    return (
        <div className="px-6 py-3 w-full max-w-[800px] mx-auto text-black font-sans relative z-0" style={{ fontSize: "11px" }}>
            {/* Watermark Logo */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.10] -z-10 pointer-events-none flex justify-center items-center w-full">
                {settings?.logoUrl && <img src={settings.logoUrl} alt="Watermark" className="w-[80%] max-w-[600px] object-contain -rotate-12" />}
            </div>

            {/* Main Content Wrapper for z-index */}
            <div className="relative">
                {/* Header Section */}
            <div className="bg-[#4b4b4b] mx-5 mt-5 mb-8 rounded-[40px] flex items-center justify-between h-[120px] relative print:bg-[#4b4b4b] print:border print:border-black">
              <div className="bg-white h-full w-[calc(100%-180px)] rounded-l-[40px] flex items-center justify-start p-0 box-border border border-black print:border-black">
                {settings?.logoUrl && <img src={settings.logoUrl} alt="Hospital Logo" className="w-full h-full rounded-l-[40px] object-fill" />}
              </div>
              <div className="bg-white w-[150px] h-[150px] rounded-full absolute right-5 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center text-center shadow-[0_4px_10px_rgba(0,0,0,0.15)] z-10 border border-black print:border-black">
                <span className="text-sm mb-1 text-[#e53e3e]">Help Line :</span>
                <span className="text-lg font-bold text-[#e53e3e]">{settings?.helpline || 'N/A'}</span>
              </div>
            </div>

            {/* Patient Info & Receipt Details */}
            <div className="border border-black p-2 text-[11px] mb-6 uppercase flex flex-row relative z-10 bg-transparent">
                {/* Left side: Patient Info */}
                <div className="w-2/3 pr-4 border-r border-black space-y-2 text-black">
                    <div className="flex gap-4">
                        <div className="flex-1 border-b border-dotted border-black pb-1">Pt.NAME - <span className="font-semibold">{patient.name}</span></div>
                        <div className="w-48 border-b border-dotted border-black pb-1">AGE / GENDER - <span className="font-semibold">{patient.age} / {patient.gender}</span></div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1 border-b border-dotted border-black pb-1">Dr. IN-CHARGE - <span className="font-semibold">{patient.doctor || ""}</span></div>
                        <div className="w-48 border-b border-dotted border-black pb-1">ADDMITION - <span className="font-semibold">{new Date(patient.registeredAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</span></div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1 border-b border-dotted border-black pb-1">ADDRESH - <span className="font-semibold">{patient.city}</span></div>
                        <div className="w-48 border-b border-dotted border-black pb-1">DISEASE - </div>
                    </div>
                </div>
                {/* Right side: Admission / Receipt Info */}
                <div className="w-1/3 pl-4 text-[10px] leading-tight space-y-1 text-black font-semibold">
                    <div className="grid grid-cols-[100px_1fr]"><span className="text-black">Admission No</span> <span>- {patient.code}</span></div>
                    <div className="grid grid-cols-[100px_1fr]"><span className="text-black">Indoor No</span> <span>- {patient.code}</span></div>
                    <div className="grid grid-cols-[100px_1fr]"><span className="text-black">RECEIPT No</span> <span>- {data.receiptNo}</span></div>
                    <div className="grid grid-cols-[100px_1fr]"><span className="text-black">Bill Date</span> <span>- {new Date(data.billDate).toLocaleDateString('en-GB')}</span></div>
                    <div className="grid grid-cols-[100px_1fr]"><span className="text-black">Discharge Date</span> <span>- {data.dischargeDate ? new Date(data.dischargeDate).toLocaleDateString('en-GB') : "Pending"}</span></div>
                    <div className="grid grid-cols-[100px_1fr]"><span className="text-black">Ward</span> <span>- {data.ward}</span></div>
                    <div className="grid grid-cols-[100px_1fr]"><span className="text-black">Bed Category</span> <span>- {data.bedCategory}</span></div>
                </div>
            </div>

            {/* Title */}
            <div className="text-center font-bold text-red-600 text-[13px] py-1 mb-2 tracking-wider border border-black bg-transparent">
                LABORATORY BILL
            </div>

            {/* Table */}
            <div className="border border-black mb-2 relative z-10 bg-transparent text-black">
                <table className="w-full text-[11px] border-collapse bg-transparent text-black border border-black print:border-black">
                    <thead>
                        <tr className="text-red-600 border-b border-black">
                            <th className="w-10 py-1 text-left px-2 font-normal border-r border-black print:border-black">NO</th>
                            <th className="py-1 text-left px-2 font-normal border-r border-black print:border-black">Particular Procedure</th>
                            <th className="w-24 py-1 text-center px-2 font-normal border-r border-black print:border-black">Days / Qty</th>
                            <th className="w-24 py-1 text-center px-2 font-normal border-r border-black print:border-black">Charges</th>
                            <th className="w-28 py-1 text-center px-2 font-normal">Total Charges</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.items.map((it: any, idx: number) => (
                            <tr key={idx}>
                                <td className="px-2 py-1 align-top text-black print:text-black border-r border-black print:border-black underline">{idx + 1}</td>
                                <td className="px-2 py-1 font-semibold text-black print:text-black border-r border-black print:border-black">{it.description}</td>
                                <td className="px-2 py-1 text-center text-black print:text-black border-r border-black print:border-black">{it.daysQty}</td>
                                <td className="px-2 py-1 text-center text-black print:text-black border-r border-black print:border-black">{it.charges}</td>
                                <td className="px-2 py-1 text-center text-black print:text-black">{it.totalCharges}</td>
                            </tr>
                        ))}
                        {/* Minimum height filler rows */}
                        {[...Array(Math.max(0, 8 - data.items.length))].map((_, i) => (
                            <tr key={`empty-${i}`}>
                                <td className="px-2 py-3 border-r border-black print:border-black"></td>
                                <td className="px-2 py-3 border-r border-black print:border-black"></td>
                                <td className="px-2 py-3 border-r border-black print:border-black"></td>
                                <td className="px-2 py-3 border-r border-black print:border-black"></td>
                                <td className="px-2 py-3"></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals Section */}
            <div className="flex border border-black mb-2 text-[11px] relative z-10 bg-transparent">
                <div className="w-1/2 p-2 border-r border-black space-y-1 text-red-600 print:text-red-600">
                    <div className="font-bold mb-1 uppercase text-black">Bank Details</div>
                    <div className="grid grid-cols-[110px_1fr]"><span>Account Name</span> <span>— {settings?.bankAccountName || 'Lifecare Hospital'}</span></div>
                    <div className="grid grid-cols-[110px_1fr]"><span>A / C No</span> <span>— {settings?.bankAccountNumber || '-'}</span></div>
                    <div className="grid grid-cols-[110px_1fr]"><span>BANK NAME</span> <span>— {settings?.bankName || '-'}</span></div>
                    <div className="grid grid-cols-[110px_1fr]"><span>IFSE Code</span> <span>— {settings?.bankIfscCode || '-'}</span></div>
                </div>
                <div className="w-1/2 p-2 flex flex-col justify-center space-y-2 text-red-600 font-bold print:text-red-600">
                    <div className="flex justify-between items-center pr-4">
                        <span>Total Amount</span>
                        <span>=</span>
                        <span className="w-24 text-right">{data.totalAmount.toLocaleString('en-IN')} /-</span>
                    </div>
                    <div className="flex justify-between items-center pr-4">
                        <span>Discount Amount</span>
                        <span>=</span>
                        <span className="w-24 text-right">{data.discountAmount > 0 ? data.discountAmount.toLocaleString('en-IN') : "-"}</span>
                    </div>
                    <div className="flex justify-between items-center pr-4 pt-2 border-t border-red-200 print:border-red-600">
                        <span>Net Amount</span>
                        <span>=</span>
                        <span className="w-24 text-right text-lg">{data.netAmount.toLocaleString('en-IN')} /-</span>
                    </div>
                </div>
            </div>
            
            <div className="border border-black p-2 text-[11px] font-semibold mb-6 text-black relative z-10 bg-transparent">
                Amount In Words — <span className="font-normal capitalize text-black">{numberToWords.toWords(data.netAmount)} Only.</span>
            </div>

            {/* Signatures */}
            <div className="flex justify-between mt-16 px-4 text-[11px] font-semibold text-black">
                <div className="border-b border-black pb-1 px-4 text-black">RELATIVE / PATIENT SIGNETURE</div>
                <div className="border-b border-black pb-1 px-4 text-black">AUTHORISED SIGNATURE</div>
            </div>
            </div>
        </div>
    );
};


function FinalBillDialog({ patient, onClose, settings }: { patient: Patient; onClose: () => void; settings: any }) {
  const db = useDB();
  const [items, setItems] = useState<any[]>([{ description: "", itemReceiptNo: "1", charges: 0, totalCharges: 0 }]);
  const [receiptNo, setReceiptNo] = useState(`IPD-${patient.id}-${Date.now().toString().slice(-4)}`);
  const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0]);
  const [dischargeDate, setDischargeDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [printData, setPrintData] = useState<any | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [totalDeposits, setTotalDeposits] = useState(0);
  const [depositDateRange, setDepositDateRange] = useState("");
  

  const fetchHistory = async () => {
    try {
      const data = await apiService.finalBills.getByPatientId(patient.id);
      setHistory(data || []);

      // Calculate totals for pre-population
      let ipdSum = 0;
      try {
        const ipdBills = await apiService.ipdCaseBills.getByPatientId(patient.id);
        ipdSum = (ipdBills || []).reduce((sum: number, b: any) => sum + (Number(b.netAmount) || 0), 0);
      } catch (e) {}

      let labSum = 0;
      try {
        const labBills = await apiService.labBills.getByPatientId(patient.id);
        labSum = (labBills || []).reduce((sum: number, b: any) => sum + (Number(b.netAmount) || 0), 0);
      } catch (e) {}
      
      setItems([
          { description: "Hospital Total Bill Amount ( Bill- )", itemReceiptNo: "1", charges: ipdSum, totalCharges: ipdSum, isLocked: true },
          { description: "Laboratory Investigation Total Bill Amount", itemReceiptNo: "1", charges: labSum, totalCharges: labSum, isLocked: true },
      ]);

      const deposits = await apiService.depositReceipts.getByPatientId(patient.id);
      if (deposits && deposits.length > 0) {
        const depositsSum = deposits.reduce((sum: number, d: any) => sum + (Number(d.netAmount) || 0), 0);
        setTotalDeposits(depositsSum);
        const sorted = deposits.sort((a: any, b: any) => new Date(a.billDate).getTime() - new Date(b.billDate).getTime());
        const first = new Date(sorted[0].billDate).toLocaleDateString("en-GB");
        const last = new Date(sorted[sorted.length-1].billDate).toLocaleDateString("en-GB");
        setDepositDateRange(`${first} To ${last}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [patient.id]);

  const addItem = () => setItems([...items, { description: "", itemReceiptNo: "1", charges: 0, totalCharges: 0, isLocked: false }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: string, val: any) => {
    const newItems = [...items];
    newItems[i] = { ...newItems[i], [field]: val };
    
    if (field === "description") {
        const charge = db.charges.find(c => c.name === val);
        if (charge) {
            newItems[i].charges = charge.amount;
            newItems[i].totalCharges = charge.amount * (Number(newItems[i].itemReceiptNo) || 1);
        }
    } else if (field === "itemReceiptNo") {
        newItems[i].totalCharges = (Number(newItems[i].charges) || 0) * (Number(val) || 1);
    } else if (field === "charges") {
        newItems[i].totalCharges = (Number(val) || 0) * (Number(newItems[i].itemReceiptNo) || 1);
    }
    setItems(newItems);
  };

  const finalDepositAmount = items.reduce((sum, it) => sum + (Number(it.totalCharges) || 0), 0);
  const discountAmount = 0; 
  const netAmount = finalDepositAmount - totalDeposits - discountAmount;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        patientId: patient.id,
        receiptNo,
        billDate,
        dischargeDate: dischargeDate ? new Date(dischargeDate).toISOString() : null,
        ward: patient.ward || "General",
        bedCategory: patient.wardNumber ? `General/${patient.wardNumber}` : "General",
        totalAmount: finalDepositAmount,
        depositAmount: totalDeposits,
        depositDateRange: depositDateRange,
        netAmount,
        items: items.filter(it => it.description.trim() !== "").map(it => ({
            description: it.description,
            daysQty: Number(it.itemReceiptNo) || 1,
            charges: Number(it.charges) || 0,
            totalCharges: Number(it.totalCharges) || 0
        }))
      };

      const res = await apiService.finalBills.create(payload);
      toast.success("Case Bill saved successfully");
      await fetchHistory();
      setPrintData(res);
    } catch (e: any) {
      toast.error("Failed to save Case Bill");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
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

    const htmlContent = renderToString(
      <FinalBillPrintTemplate data={printData} patient={patient} settings={settings} />
    );

    printWindow.document.write(`
      <html>
        <head>
          <title>IPD Case Bill — ${patient.name}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page { margin: 0; }
            body { font-family: system-ui, -apple-system, sans-serif; padding: 0; margin: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            * { box-sizing: border-box; }
            @media print { html, body { width: 210mm; } }
          </style>
        </head>
        <body onload="setTimeout(() => { window.print(); }, 500)">
          ${htmlContent}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>IPD Case Bill for {patient.name}</DialogTitle>
        </DialogHeader>

        {printData ? (
            <div className="space-y-4">
                <div className="border p-4 bg-white text-black overflow-x-auto">
                    <FinalBillPrintTemplate data={printData} patient={patient} settings={settings} />
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setPrintData(null)}>Back</Button>
                    <Button onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> Print Bill</Button>
                </div>
            </div>
        ) : (
            <div className="space-y-4">
                {history.length > 0 && (
                    <div className="border rounded-md p-4 bg-muted/20">
                        <h3 className="font-semibold text-sm mb-2">Past Case Bills</h3>
                        <div className="space-y-2">
                            {history.map((h, idx) => (
                                <div key={idx} className="flex justify-between items-center p-2 border bg-background rounded text-sm">
                                    <div>
                                        <span className="font-medium">{h.receiptNo}</span> - {new Date(h.billDate).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className="font-semibold text-red-600">₹ {h.netAmount}</span>
                                        <Button variant="outline" size="sm" onClick={() => setPrintData(h)}>
                                            <Printer className="h-4 w-4 mr-2" /> View
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <h3 className="font-semibold text-sm border-b pb-2">New Case Bill</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-1">
                        <Label className="text-xs">Receipt No</Label>
                        <Input value={receiptNo} readOnly className="h-8 text-sm bg-muted cursor-not-allowed text-muted-foreground" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Bill Date</Label>
                        <Input type="date" value={billDate} onChange={e => setBillDate(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Discharge Date (Opt)</Label>
                        <Input type="date" value={dischargeDate} onChange={e => setDischargeDate(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Less: Deposit</Label>
                        <Input value={totalDeposits} readOnly className="h-8 text-sm bg-muted cursor-not-allowed text-red-600 font-semibold" />
                    </div>
                </div>

                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">No</TableHead>
                                <TableHead>Particular Procedure</TableHead>
                                <TableHead className="w-[120px]">Days / Qty</TableHead>
                                <TableHead className="w-[120px]">Charges</TableHead>
                                <TableHead className="w-[120px]">Total Charges</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((it, idx) => (
                                <TableRow key={idx}>
                                    <TableCell>{idx + 1}</TableCell>
                                    <TableCell>
                                        {it.isLocked ? (
                                            <div className="h-8 px-2 flex items-center text-sm font-medium bg-muted/30 rounded border border-dashed border-muted-foreground/30 text-foreground">
                                                {it.description}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    value={it.description}
                                                    onChange={e => updateItem(idx, "description", e.target.value)}
                                                    placeholder="Enter charge description..."
                                                    className="h-8 flex-1"
                                                />
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {it.isLocked ? (
                                            <div className="h-8 px-2 flex items-center text-sm font-semibold text-muted-foreground bg-muted/30 rounded">{it.itemReceiptNo}</div>
                                        ) : (
                                            <Input type="number" value={it.itemReceiptNo} onChange={e => updateItem(idx, "itemReceiptNo", e.target.value)} placeholder="1" className="h-8" />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {it.isLocked ? (
                                            <div className="h-8 px-2 flex items-center text-sm font-semibold text-primary bg-muted/30 rounded">{it.charges}</div>
                                        ) : (
                                            <Input type="number" value={it.charges} onChange={e => updateItem(idx, "charges", e.target.value)} className="h-8" />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {it.isLocked ? (
                                            <div className="h-8 px-2 flex items-center text-sm font-semibold text-primary bg-muted/30 rounded">{it.totalCharges}</div>
                                        ) : (
                                            <Input type="number" value={it.totalCharges} onChange={e => updateItem(idx, "totalCharges", e.target.value)} className="h-8" />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {!it.isLocked && (
                                            <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="h-8 w-8 text-red-500 hover:text-red-600"><Trash className="h-4 w-4" /></Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                <Button variant="outline" size="sm" onClick={addItem} className="w-full"><Plus className="h-4 w-4 mr-2" /> Add Row</Button>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving || items.length === 0}>Save & Generate Bill</Button>
                </div>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const FinalBillPrintTemplate = ({ data, patient, settings }: any) => {
    return (
        <div className="px-6 py-3 w-full max-w-[800px] mx-auto text-black font-sans relative z-0" style={{ fontSize: "11px" }}>
            {/* Watermark Logo */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.10] -z-10 pointer-events-none flex justify-center items-center w-full">
                {settings?.logoUrl && <img src={settings.logoUrl} alt="Watermark" className="w-[80%] max-w-[600px] object-contain -rotate-12" />}
            </div>

            {/* Main Content Wrapper for z-index */}
            <div className="relative">
                {/* Header Section */}
            <div className="bg-[#4b4b4b] mx-5 mt-5 mb-8 rounded-[40px] flex items-center justify-between h-[120px] relative print:bg-[#4b4b4b] print:border print:border-black">
              <div className="bg-white h-full w-[calc(100%-180px)] rounded-l-[40px] flex items-center justify-start p-0 box-border border border-black print:border-black">
                {settings?.logoUrl && <img src={settings.logoUrl} alt="Hospital Logo" className="w-full h-full rounded-l-[40px] object-fill" />}
              </div>
              <div className="bg-white w-[150px] h-[150px] rounded-full absolute right-5 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center text-center shadow-[0_4px_10px_rgba(0,0,0,0.15)] z-10 border border-black print:border-black">
                <span className="text-sm mb-1 text-[#e53e3e]">Help Line :</span>
                <span className="text-lg font-bold text-[#e53e3e]">{settings?.helpline || 'N/A'}</span>
              </div>
            </div>

            {/* Patient Info & Receipt Details */}
            <div className="border border-black p-2 text-[11px] mb-6 uppercase flex flex-row relative z-10 bg-transparent">
                {/* Left side: Patient Info */}
                <div className="w-2/3 pr-4 border-r border-black space-y-2 text-black">
                    <div className="flex gap-4">
                        <div className="flex-1 border-b border-dotted border-black pb-1">Pt.NAME - <span className="font-semibold">{patient.name}</span></div>
                        <div className="w-48 border-b border-dotted border-black pb-1">AGE / GENDER - <span className="font-semibold">{patient.age} / {patient.gender}</span></div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1 border-b border-dotted border-black pb-1">Dr. IN-CHARGE - <span className="font-semibold">{patient.doctor || ""}</span></div>
                        <div className="w-48 border-b border-dotted border-black pb-1">ADDMITION - <span className="font-semibold">{new Date(patient.registeredAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</span></div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1 border-b border-dotted border-black pb-1">ADDRESH - <span className="font-semibold">{patient.city}</span></div>
                        <div className="w-48 border-b border-dotted border-black pb-1">DISEASE - </div>
                    </div>
                </div>
                {/* Right side: Admission / Receipt Info */}
                <div className="w-1/3 pl-4 text-[10px] leading-tight space-y-1 text-black font-semibold">
                    <div className="grid grid-cols-[100px_1fr]"><span className="text-black">Admission No</span> <span>- {patient.code}</span></div>
                    <div className="grid grid-cols-[100px_1fr]"><span className="text-black">Indoor No</span> <span>- {patient.code}</span></div>
                    <div className="grid grid-cols-[100px_1fr]"><span className="text-black">RECEIPT No</span> <span>- {data.receiptNo}</span></div>
                    <div className="grid grid-cols-[100px_1fr]"><span className="text-black">Bill Date</span> <span>- {new Date(data.billDate).toLocaleDateString('en-GB')}</span></div>
                    <div className="grid grid-cols-[100px_1fr]"><span className="text-black">Discharge Date</span> <span>- {data.dischargeDate ? new Date(data.dischargeDate).toLocaleDateString('en-GB') : "Pending"}</span></div>
                    <div className="grid grid-cols-[100px_1fr]"><span className="text-black">Ward</span> <span>- {data.ward}</span></div>
                    <div className="grid grid-cols-[100px_1fr]"><span className="text-black">Bed Category</span> <span>- {data.bedCategory}</span></div>
                </div>
            </div>

            {/* Title */}
            <div className="text-center font-bold text-red-600 text-[13px] py-1 mb-2 tracking-wider border border-black bg-transparent">
                IPD FINAL CASE BILL
            </div>

            {/* Table */}
            <div className="border border-black mb-2 relative z-10 bg-transparent text-black">
                <table className="w-full text-[11px] border-collapse bg-transparent text-black border border-black print:border-black">
                    <thead>
                        <tr className="text-red-600 border-b border-black">
                            <th className="w-10 py-1 text-left px-2 font-normal border-r border-black print:border-black">NO</th>
                            <th className="py-1 text-left px-2 font-normal border-r border-black print:border-black">Particular Procedure</th>
                            <th className="w-24 py-1 text-center px-2 font-normal border-r border-black print:border-black">Days / Qty</th>
                            <th className="w-24 py-1 text-center px-2 font-normal border-r border-black print:border-black">Charges</th>
                            <th className="w-28 py-1 text-center px-2 font-normal">Total Charges</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.items.map((it: any, idx: number) => (
                            <tr key={idx}>
                                <td className="px-2 py-1 align-top text-black print:text-black border-r border-black print:border-black underline">{idx + 1}</td>
                                <td className="px-2 py-1 font-semibold text-black print:text-black border-r border-black print:border-black">{it.description}</td>
                                <td className="px-2 py-1 text-center text-black print:text-black border-r border-black print:border-black">{it.daysQty}</td>
                                <td className="px-2 py-1 text-center text-black print:text-black border-r border-black print:border-black">{it.charges}</td>
                                <td className="px-2 py-1 text-center text-black print:text-black">{it.totalCharges}</td>
                            </tr>
                        ))}
                        {/* Minimum height filler rows */}
                        {[...Array(Math.max(0, 8 - data.items.length))].map((_, i) => (
                            <tr key={`empty-${i}`}>
                                <td className="px-2 py-3 border-r border-black print:border-black"></td>
                                <td className="px-2 py-3 border-r border-black print:border-black"></td>
                                <td className="px-2 py-3 border-r border-black print:border-black"></td>
                                <td className="px-2 py-3 border-r border-black print:border-black"></td>
                                <td className="px-2 py-3"></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals Section */}
            <div className="border border-black mb-2 relative z-10 bg-transparent text-black p-2 flex flex-col gap-1">
                <div className="flex justify-between font-bold text-red-600">
                    <span>Final Total Amount</span>
                    <span>=</span>
                    <span className="w-32 text-right">{data.totalAmount.toLocaleString("en-IN")} /-</span>
                </div>
                <div className="border border-black p-1 mt-1 text-black">
                    In Words — {numberToWords.toWords(data.totalAmount)} Only.
                </div>
            </div>
            
            <div className="border border-black mb-2 relative z-10 bg-transparent text-black p-2 flex flex-col gap-1">
                <div className="flex justify-between font-bold text-red-600">
                    <span>Total Deposit Amount {data.depositDateRange ? `( ${data.depositDateRange} )` : ""}</span>
                    <span>=</span>
                    <span className="w-32 text-right">{data.depositAmount.toLocaleString("en-IN")} /-</span>
                </div>
                <div className="border border-black p-1 mt-1 text-black">
                    In Words — {numberToWords.toWords(data.depositAmount)} Only.
                </div>
            </div>

            <div className="flex border border-black mb-2 text-[11px] relative z-10 bg-transparent">
                <div className="w-1/2 p-2 border-r border-black space-y-1 text-red-600 print:text-red-600">
                    <div className="font-bold mb-1 uppercase text-black">Bank Details</div>
                    <div className="grid grid-cols-[110px_1fr]"><span>Account Name</span> <span>— {settings?.bankAccountName || 'Lifecare Hospital'}</span></div>
                    <div className="grid grid-cols-[110px_1fr]"><span>A / C No</span> <span>— {settings?.bankAccountNumber || '-'}</span></div>
                    <div className="grid grid-cols-[110px_1fr]"><span>BANK NAME</span> <span>— {settings?.bankName || '-'}</span></div>
                    <div className="grid grid-cols-[110px_1fr]"><span>IFSE Code</span> <span>— {settings?.bankIfscCode || '-'}</span></div>
                </div>
                <div className="w-1/2 p-2 flex flex-col justify-center space-y-2 text-red-600 font-bold print:text-red-600">
                    <div className="flex justify-between items-center pr-4">
                        <span>Total Amount</span>
                        <span>=</span>
                        <span className="w-24 text-right">{data.totalAmount.toLocaleString('en-IN')} /-</span>
                    </div>
                    <div className="flex justify-between items-center pr-4">
                        <span>Deposit Amount</span>
                        <span>=</span>
                        <span className="w-24 text-right">{data.depositAmount > 0 ? data.depositAmount.toLocaleString('en-IN') : "-"}</span>
                    </div>
                    <div className="flex justify-between items-center pr-4 pt-2 border-t border-red-200 print:border-red-600">
                        <span>Net Amount</span>
                        <span>=</span>
                        <span className="w-24 text-right text-lg">{data.netAmount.toLocaleString('en-IN')} /-</span>
                    </div>
                </div>
            </div>
            
            <div className="border border-black p-2 text-[11px] font-semibold mb-6 text-black relative z-10 bg-transparent">
                Amount In Words — <span className="font-normal capitalize text-black">{numberToWords.toWords(data.netAmount)} Only.</span>
            </div>

            {/* Signatures */}
            <div className="flex justify-between mt-16 px-4 text-[11px] font-semibold text-black">
                <div className="border-b border-black pb-1 px-4 text-black">RELATIVE / PATIENT SIGNETURE</div>
                <div className="border-b border-black pb-1 px-4 text-black">AUTHORISED SIGNATURE</div>
            </div>
            </div>
        </div>
    );
};
