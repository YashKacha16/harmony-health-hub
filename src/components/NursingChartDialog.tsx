import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Printer, Plus, Trash2 } from "lucide-react";
import type { Patient, Medicine } from "@/lib/store";
import { useDB } from "@/lib/useStore";
import { medicalService } from "@/services/medicalService";

function MedicineSearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (name: string, isSyrup?: boolean) => void;
}) {
  const db = useDB();
  const [q, setQ] = useState(value || "");
  const [results, setResults] = useState<Medicine[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQ(value || "");
  }, [value]);

  useEffect(() => {
    if (q.trim().length >= 2 && open) {
      const timer = setTimeout(async () => {
        const res = await medicalService.searchMedicine(q.trim());
        setResults(res);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setResults([]);
    }
  }, [q, open]);

  const handleBlur = () => {
    setTimeout(() => {
      setOpen(false);
    }, 200);
  };

  const handleSelectMedicine = (m: Medicine) => {
    setQ(m.name);
    
    // Find category name from db.categories
    const categoryObj = db.categories.find((c) => c.id === m.categoryId);
    const catName = categoryObj ? categoryObj.name.toLowerCase() : "";
    const lowerName = m.name.toLowerCase();

    // Automatic detection based on category name or medicine name
    const isSyrupCat = catName.includes("syrup") || catName.includes("syr") || lowerName.includes("syrup") || lowerName.includes("syr") || lowerName.includes("ml");

    onChange(m.name, isSyrupCat);
    setOpen(false);
  };

  return (
    <div className="relative flex-1">
      <Input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        placeholder="Search medicine (e.g. Paracetamol)..."
        className="h-8 text-xs w-full"
      />
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 mt-1 min-w-[240px] w-full bg-popover text-popover-foreground rounded-md border shadow-xl z-[9999] overflow-hidden max-h-48 overflow-y-auto">
          {results.map((m) => {
            const catName = db.categories.find((c) => c.id === m.categoryId)?.name || "";
            return (
              <div
                key={m.id}
                className="px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground cursor-pointer flex justify-between items-center border-b last:border-0"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectMedicine(m);
                }}
              >
                <div>
                  <span className="font-semibold text-foreground">{m.name}</span>
                  {catName && <span className="text-[10px] text-muted-foreground ml-1.5 px-1 py-0.2 bg-muted rounded">({catName})</span>}
                </div>
                {m.quantity !== undefined && <span className="text-muted-foreground text-[10px] ml-2 shrink-0">Stock: {m.quantity}</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface NursingChartDialogProps {
  patient: Patient;
  settings: any;
  onClose: () => void;
}

export function NursingChartDialog({ patient, settings, onClose }: NursingChartDialogProps) {
  const db = useDB();
  const [intervalHours, setIntervalHours] = useState<string>("2");

  // State for medications & notes
  const [medRows, setMedRows] = useState<{
    name: string;
    isSyrup: boolean;
    morning: boolean | string;
    afternoon: boolean | string;
    evening: boolean | string;
    night: boolean | string;
  }[]>([]);
  const [noteText, setNoteText] = useState("");
  const [investigationText, setInvestigationText] = useState("");

  useEffect(() => {
    // Pre-fill existing prescription if found
    const rx = (db?.prescriptions || []).find((p: any) => p.patientId === patient.id);
    if (rx) {
      if (rx.medicines && rx.medicines.length > 0) {
        setMedRows(
          rx.medicines.map((m: any) => {
            const lowerName = (m.name || "").toLowerCase();
            const isSyr = lowerName.includes("syrup") || lowerName.includes("syr") || lowerName.includes("ml");
            const parseVal = (val: any) => {
              if (val === true || val === "true" || val === "1" || val === "✓") return isSyr ? "" : true;
              if (val === false || val === "false" || val === "0" || !val) return isSyr ? "" : false;
              return val;
            };
            return {
              name: m.name || "",
              isSyrup: isSyr,
              morning: parseVal(m.morning),
              afternoon: parseVal(m.afternoon),
              evening: parseVal(m.evening),
              night: parseVal(m.night),
            };
          })
        );
      }
      setNoteText(rx.suggestion || "");
      setInvestigationText(rx.diagnosis || "");
    }
  }, [db?.prescriptions, patient.id]);

  const addMedRow = () => {
    setMedRows((prev) => [...prev, { name: "", isSyrup: false, morning: false, afternoon: false, evening: false, night: false }]);
  };

  const updateMedRow = (index: number, key: string, val: any) => {
    setMedRows((prev) => {
      const copy = [...prev];
      if (key === "isSyrup") {
        const isSyr = !!val;
        copy[index] = {
          ...copy[index],
          isSyrup: isSyr,
          morning: isSyr ? "" : false,
          afternoon: isSyr ? "" : false,
          evening: isSyr ? "" : false,
          night: isSyr ? "" : false,
        };
      } else {
        copy[index] = { ...copy[index], [key]: val };
      }
      return copy;
    });
  };

  const removeMedRow = (index: number) => {
    setMedRows((prev) => prev.filter((_, i) => i !== index));
  };

  const generateVitalsTimes = (admissionDateStr: string, stepHours: number): string[] => {
    // Use current time when printing so chart reflects the active shift starting from print time
    const baseDate = new Date();
    const startHour = baseDate.getHours();

    let targetBoundaryHour: number;
    let isNextDay = false;

    if (startHour >= 8 && startHour < 20) {
      targetBoundaryHour = 20; // 8 PM today
    } else if (startHour >= 20) {
      targetBoundaryHour = 8; // 8 AM next day
      isNextDay = true;
    } else {
      targetBoundaryHour = 8; // 8 AM today
    }

    const times: string[] = [];
    const current = new Date(baseDate);

    let maxSteps = 24;
    while (maxSteps > 0) {
      const h = current.getHours();
      const ampm = h >= 12 ? "PM" : "AM";
      const displayH = h % 12 === 0 ? 12 : h % 12;
      const mStr = current.getMinutes().toString().padStart(2, "0");
      const timeFormatted = `${displayH}:${mStr} ${ampm}`;
      times.push(timeFormatted);

      // Advance by interval
      current.setHours(current.getHours() + stepHours);

      if (targetBoundaryHour === 20) {
        if (current.getHours() > 20 || (current.getHours() === 20 && current.getMinutes() > 0) || current.getDate() !== baseDate.getDate()) {
          if (current.getHours() === 20 && current.getMinutes() === 0 && current.getDate() === baseDate.getDate()) {
            times.push("8:00 PM");
          }
          break;
        }
      } else {
        if (isNextDay) {
          if (current.getDate() > baseDate.getDate() && (current.getHours() > 8 || (current.getHours() === 8 && current.getMinutes() > 0))) {
            if (current.getHours() === 8 && current.getMinutes() === 0) {
              times.push("8:00 AM");
            }
            break;
          }
        } else {
          if (current.getHours() > 8 || (current.getHours() === 8 && current.getMinutes() > 0) || current.getDate() !== baseDate.getDate()) {
            if (current.getHours() === 8 && current.getMinutes() === 0 && current.getDate() === baseDate.getDate()) {
              times.push("8:00 AM");
            }
            break;
          }
        }
      }

      maxSteps--;
    }

    return times;
  };

  const handlePrint = () => {
    const step = parseInt(intervalHours, 10) || 2;
    const generatedTimes = generateVitalsTimes(patient.registeredAt, step);

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

    const logoUrl = settings?.logoUrl && settings.logoUrl !== '/logo.png' ? settings.logoUrl : '/lifecare-logo.jpg';
    const helpline = settings?.helpline || '7654 108 108';

    // Parse wards
    const wards = patient.ward ? patient.ward.split(" & ") : [];
    const wardNums = patient.wardNumber ? patient.wardNumber.split(" & ") : [];
    const wardStr = wards.map((w, i) => `${w}${wardNums[i] ? ` (${wardNums[i]})` : ''}`).join(", ");

    const dateStr = new Date(patient.registeredAt).toLocaleDateString();
    const timeStr = new Date(patient.registeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Rows for Page 1 (Injections / Medication) - 22 rows total
    let page1RowsHtml = "";
    for (let i = 1; i <= 22; i++) {
      const med = medRows[i - 1];
      const formatCell = (val: boolean | string | undefined) => {
        if (!med) return "";
        if (val === true) return "✓";
        if (val === false || !val) return "";
        return String(val);
      };

      page1RowsHtml += `
        <tr>
          <td style="text-align: center;">${i}</td>
          <td style="padding-left: 6px; font-weight: ${med ? 'bold' : 'normal'};">${med ? med.name : ''}</td>
          <td style="text-align: center; font-weight: bold; font-size: 13px;">${formatCell(med?.morning)}</td>
          <td style="text-align: center; font-weight: bold; font-size: 13px;">${formatCell(med?.afternoon)}</td>
          <td style="text-align: center; font-weight: bold; font-size: 13px;">${formatCell(med?.evening)}</td>
          <td style="text-align: center; font-weight: bold; font-size: 13px;">${formatCell(med?.night)}</td>
        </tr>
      `;
    }

    // Rows for Page 2 (Vitals Chart) - 26 rows to fill page height cleanly
    let page2RowsHtml = "";
    const rowCount = Math.max(26, generatedTimes.length);
    for (let i = 0; i < rowCount; i++) {
      const timeVal = generatedTimes[i] || "";
      page2RowsHtml += `
        <tr style="height: 25px;">
          <td style="text-align: center; font-weight: bold; font-size: 11px;">${timeVal}</td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      `;
    }

    const content = `
      <html>
        <head>
          <title>Nursing Chart - ${patient.name}</title>
          <style>
            @page { size: A4; margin: 0; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #fff; color: #000; font-size: 12px; }
            
            .page-container {
              width: 100%;
              padding: 0;
              position: relative;
              background: transparent;
            }

            .page-padding {
              padding: 0 20px 20px 20px;
            }

            .top-section { 
              background-color: #4b4b4b !important; 
              margin: 15px 20px 20px 20px;
              border-radius: 40px;
              display: flex; 
              align-items: center; 
              justify-content: space-between; 
              height: 110px;
              position: relative;
            }
            .logo-container { 
              background-color: white !important;
              height: 100%;
              width: calc(100% - 170px);
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
              width: 135px;
              height: 135px;
              border-radius: 50%;
              position: absolute;
              right: 15px;
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
            .helpline-title { font-size: 13px; margin-bottom: 3px; }
            .helpline-number { font-size: 16px; font-weight: bold; }

            .watermark {
              position: fixed;
              top: 30%;
              left: 10%;
              width: 80%;
              height: 40%;
              background-image: url('${logoUrl}');
              background-size: contain;
              background-position: center;
              background-repeat: no-repeat;
              opacity: 0.15;
              transform: rotate(-30deg);
              -webkit-transform: rotate(-30deg);
              z-index: -1;
              pointer-events: none;
            }

            .page-break {
              page-break-before: always;
            }

            /* Main Outer Box with Border */
            .outer-border-box {
              border: 2px solid #000;
              width: 100%;
            }

            /* Sub Meta Info Box */
            .header-meta-table {
              width: 100%;
              border-collapse: collapse;
              border-bottom: 2px solid #000;
              font-size: 11px;
            }
            .header-meta-table td {
              padding: 6px 10px;
              vertical-align: top;
            }

            /* Patient Info Details Box */
            .patient-details-box {
              padding: 8px 10px;
              border-bottom: 2px solid #000;
              font-weight: bold;
              font-size: 11px;
              line-height: 1.8;
            }
            .patient-details-box span.val {
              font-weight: normal;
              margin-right: 15px;
            }

            /* Tables for Medications & Vitals */
            .grid-table {
              width: 100%;
              border-collapse: collapse;
            }
            .grid-table th {
              border: 1px solid #000;
              background: #222 !important;
              color: #fff !important;
              padding: 5px 4px;
              font-size: 11px;
              font-weight: bold;
              text-transform: uppercase;
              text-align: center;
            }
            .grid-table td {
              border: 1px solid #000;
              height: 22px;
              padding: 2px 4px;
              font-size: 11px;
            }

            /* Page 1 Bottom Note Area */
            .bottom-notes {
              border-top: 2px solid #000;
              padding: 8px;
              font-size: 12px;
              font-weight: bold;
              line-height: 2;
              min-height: 60px;
            }

            /* Page 2 Bottom Footer Grid */
            .p2-footer-table {
              width: 100%;
              border-collapse: collapse;
              border-top: 2px solid #000;
              font-size: 11px;
            }
            .p2-footer-table td {
              vertical-align: top;
              padding: 6px 10px;
              border-right: 1px solid #000;
            }
            .p2-footer-table td:last-child {
              border-right: none;
            }

            .staff-signatures-list {
              line-height: 2.2;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="watermark"></div>

          <!-- PAGE 1: INJECTION / MEDICATION CHART -->
          <div class="page-container">
            <div class="top-section">
              <div class="logo-container">
                <img src="${logoUrl}" alt="Hospital Logo" onerror="this.style.display='none'" />
              </div>
              <div class="helpline-circle">
                <span class="helpline-title">Help Line No :</span>
                <span class="helpline-number">${helpline}</span>
              </div>
            </div>

            <div class="page-padding">
              <div class="outer-border-box">
                <table class="header-meta-table">
                  <tr>
                    <td style="width: 50%;">
                      <div>DATE - <strong>${dateStr}</strong> &nbsp;&nbsp;&nbsp;&nbsp; TIME - <strong>${timeStr}</strong></div>
                      <div>ROOM NO. - <strong>${wardNums[0] || '-'}</strong></div>
                      <div>BED NO. - <strong>${wardNums[1] || wardNums[0] || '-'}</strong></div>
                      <div>INDOOR No. - <strong>${patient.code}</strong></div>
                    </td>
                    <td style="width: 50%;">
                      <div>STAFF MORNING - ________________</div>
                      <div>STAFF EVENING - ________________</div>
                      <div>STAFF NIGHT - ________________</div>
                    </td>
                  </tr>
                </table>

                <div class="patient-details-box">
                  <div>Pt,NAME - <span class="val">${patient.name}</span></div>
                  <div>
                    AGE / GENDER - <span class="val">${patient.age} / ${patient.gender}</span>
                    WARD. - <span class="val">${wardStr || '-'}</span>
                  </div>
                  <div>
                    Dr. INCHARGE - <span class="val">${patient.doctor || '-'}</span>
                    MEDICAL OFFICER - <span class="val">________________</span>
                  </div>
                  <div>DISEASE - <span class="val">${patient.complaint || '-'}</span></div>
                  <div>ADDRESS - <span class="val">${patient.addressLine ? `${patient.addressLine}, ${patient.city || ''}` : '-'}</span></div>
                </div>

                <table class="grid-table">
                  <thead>
                    <tr>
                      <th style="width: 6%;">NO.</th>
                      <th style="width: 48%; text-align: left; padding-left: 10px;">INJECTION / MEDICATION NAME</th>
                      <th style="width: 11.5%;">MORNING</th>
                      <th style="width: 11.5%;">AFTERNOON</th>
                      <th style="width: 11.5%;">EVENING</th>
                      <th style="width: 11.5%;">NIGHT</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${page1RowsHtml}
                  </tbody>
                </table>

                <div class="bottom-notes">
                  <div>Note :- <span style="font-weight: normal;">${noteText}</span></div>
                  <div>Investigations :- <span style="font-weight: normal;">${investigationText}</span></div>
                </div>
              </div>
            </div>
          </div>

          <!-- PAGE 2: VITALS CHART -->
          <div class="page-container page-break">
            <div class="top-section">
              <div class="logo-container">
                <img src="${logoUrl}" alt="Hospital Logo" onerror="this.style.display='none'" />
              </div>
              <div class="helpline-circle">
                <span class="helpline-title">Help Line No :</span>
                <span class="helpline-number">${helpline}</span>
              </div>
            </div>

            <div class="page-padding">
              <div class="outer-border-box">
                <div class="patient-details-box" style="border-bottom: 2px solid #000;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>Patient Name :- <span class="val">${patient.name}</span></div>
                    <div>Incharge Doctor :- <span class="val">${patient.doctor || '-'}</span></div>
                    <div>Date :- <span class="val">${dateStr}</span></div>
                  </div>
                  <div style="margin-top: 4px;">Advice :- <span class="val"></span></div>
                </div>

                <table class="grid-table">
                  <thead>
                    <tr>
                      <th style="width: 12%;">TIME.</th>
                      <th style="width: 9%;">B.P.</th>
                      <th style="width: 9%;">PULSE</th>
                      <th style="width: 9%;">SPo2</th>
                      <th style="width: 8%;">RR</th>
                      <th style="width: 8%;">T"</th>
                      <th style="width: 11%;">INTAKE</th>
                      <th style="width: 11%;">VOMITE</th>
                      <th style="width: 11%;">URINE ML</th>
                      <th style="width: 12%;">STOOL</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${page2RowsHtml}
                  </tbody>
                </table>

                <table class="p2-footer-table">
                  <tr>
                    <td style="width: 65%;">
                      <div style="display: flex; justify-content: space-between; margin-bottom: 12px; font-weight: bold;">
                        <span>TOTAL INTAKE :-</span>
                        <span>TOTAL (ML) URIN :-</span>
                        <span>STOOL :-</span>
                      </div>
                      <div style="display: flex; gap: 40px; margin-bottom: 12px; font-weight: bold;">
                        <span>Unit no :- ${wardStr || '-'}</span>
                        <span>Bed no :- ${wardNums.join(", ") || '-'}</span>
                      </div>
                      <div style="margin-bottom: 12px; font-weight: bold;">NOTE :-</div>
                      <div style="font-weight: bold;">Advice :-</div>
                    </td>
                    <td style="width: 35%;">
                      <div class="staff-signatures-list">
                        <div>Morning Staff :-</div>
                        <div>Afternoon Staff :-</div>
                        <div>Evening Staff :-</div>
                        <div>Night Staff :-</div>
                      </div>
                    </td>
                  </tr>
                </table>
              </div>
            </div>
          </div>

          <script>
            setTimeout(function() {
              window.print();
            }, 250);
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(content);
    printWindow.document.close();
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <FileText className="h-6 w-6 text-primary" />
            Print Nursing / Vitals Chart — {patient.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2 pr-2 flex-1">
          <div className="space-y-2 bg-muted/40 p-3.5 rounded-lg border">
            <Label htmlFor="interval" className="text-sm font-semibold">Vitals Check Interval (Page 2)</Label>
            <Select value={intervalHours} onValueChange={setIntervalHours}>
              <SelectTrigger id="interval" className="h-10 text-sm bg-background">
                <SelectValue placeholder="Select interval" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                {Array.from({ length: 24 }, (_, i) => i + 1).map((hr) => (
                  <SelectItem key={hr} value={hr.toString()}>
                    Every {hr} {hr === 1 ? "Hour" : "Hours"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Time column on Page 2 starts from admission ({new Date(patient.registeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}) up to the 8-to-8 shift boundary.
            </p>
          </div>

          <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
            <div className="flex justify-between items-center">
              <div>
                <Label className="text-base font-semibold">Page 1: Injections / Medications</Label>
                <p className="text-xs text-muted-foreground">Add or edit prescribed medications for the chart</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addMedRow} className="gap-1">
                <Plus className="h-4 w-4" /> Add Medication
              </Button>
            </div>

            {medRows.length === 0 ? (
              <div className="text-xs text-muted-foreground italic py-3 text-center border border-dashed rounded-md bg-background">
                No medicines added yet. Click "+ Add Medication" to add medicines or print a blank chart.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-56 overflow-y-visible pr-1">
                {medRows.map((row, idx) => (
                  <div key={idx} className="flex gap-3 items-center bg-background p-2.5 rounded-md border shadow-sm">
                    <MedicineSearchInput
                      value={row.name}
                      onChange={(val, isSyrupCat) => {
                        updateMedRow(idx, "name", val);
                        if (isSyrupCat !== undefined) {
                          updateMedRow(idx, "isSyrup", isSyrupCat);
                        }
                      }}
                    />

                    {/* Dosage slot controls: Checkboxes for Tablets/Injections, ML Text Inputs for Syrups */}
                    {row.isSyrup ? (
                      <div className="flex gap-1 shrink-0">
                        <Input placeholder="M (ml)" value={typeof row.morning === "string" ? row.morning : ""} onChange={(e) => updateMedRow(idx, "morning", e.target.value)} className="w-16 h-8 text-xs text-center font-medium" title="Morning ml" />
                        <Input placeholder="A (ml)" value={typeof row.afternoon === "string" ? row.afternoon : ""} onChange={(e) => updateMedRow(idx, "afternoon", e.target.value)} className="w-16 h-8 text-xs text-center font-medium" title="Afternoon ml" />
                        <Input placeholder="E (ml)" value={typeof row.evening === "string" ? row.evening : ""} onChange={(e) => updateMedRow(idx, "evening", e.target.value)} className="w-16 h-8 text-xs text-center font-medium" title="Evening ml" />
                        <Input placeholder="N (ml)" value={typeof row.night === "string" ? row.night : ""} onChange={(e) => updateMedRow(idx, "night", e.target.value)} className="w-16 h-8 text-xs text-center font-medium" title="Night ml" />
                      </div>
                    ) : (
                      <div className="flex gap-2 shrink-0 px-2 border-l border-r">
                        <label className="flex flex-col items-center cursor-pointer text-[10px] font-semibold text-muted-foreground">
                          M
                          <input
                            type="checkbox"
                            checked={!!row.morning}
                            onChange={(e) => updateMedRow(idx, "morning", e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer mt-0.5"
                          />
                        </label>
                        <label className="flex flex-col items-center cursor-pointer text-[10px] font-semibold text-muted-foreground">
                          A
                          <input
                            type="checkbox"
                            checked={!!row.afternoon}
                            onChange={(e) => updateMedRow(idx, "afternoon", e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer mt-0.5"
                          />
                        </label>
                        <label className="flex flex-col items-center cursor-pointer text-[10px] font-semibold text-muted-foreground">
                          E
                          <input
                            type="checkbox"
                            checked={!!row.evening}
                            onChange={(e) => updateMedRow(idx, "evening", e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer mt-0.5"
                          />
                        </label>
                        <label className="flex flex-col items-center cursor-pointer text-[10px] font-semibold text-muted-foreground">
                          N
                          <input
                            type="checkbox"
                            checked={!!row.night}
                            onChange={(e) => updateMedRow(idx, "night", e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer mt-0.5"
                          />
                        </label>
                      </div>
                    )}

                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0" onClick={() => removeMedRow(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
            <Label className="text-base font-semibold">Page 1: Notes &amp; Investigations</Label>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Note</Label>
                <Input placeholder="Special care / instructions..." value={noteText} onChange={(e) => setNoteText(e.target.value)} className="h-9 text-xs bg-background" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Investigations</Label>
                <Input placeholder="CBC, X-Ray, ECG..." value={investigationText} onChange={(e) => setInvestigationText(e.target.value)} className="h-9 text-xs bg-background" />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-end gap-2 pt-3 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handlePrint} className="gap-2 px-5">
            <Printer className="h-4 w-4" />
            Print Chart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
