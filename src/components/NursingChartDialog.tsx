import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Printer, Plus, Trash2 } from "lucide-react";
import type { Patient, Medicine } from "@/lib/store";
import { useDB } from "@/lib/useStore";
import { apiService } from "@/api/apiService";
import { medicalService } from "@/services/medicalService";
import { format } from "date-fns";
import { toast } from "sonner";

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
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    setQ(value || "");
  }, [value]);

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
        handleSelectMedicine(results[selectedIndex]);
      } else if (results.length > 0) {
        // Fallback to first if none selected
        handleSelectMedicine(results[0]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
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
        onKeyDown={handleKeyDown}
        placeholder="Search medicine (e.g. Paracetamol)..."
        className="h-8 text-xs w-full"
      />
      {open && results.length > 0 && (
        <div className="absolute top-full left-0 mt-1 min-w-[240px] w-full bg-popover text-popover-foreground rounded-md border shadow-xl z-[9999] overflow-hidden max-h-48 overflow-y-auto">
          {results.map((m, idx) => {
            const catName = db.categories.find((c) => c.id === m.categoryId)?.name || "";
            return (
              <div
                key={m.id}
                className={`px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground cursor-pointer flex justify-between items-center border-b last:border-0 ${selectedIndex === idx ? "bg-accent text-accent-foreground" : ""}`}
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
  onSave?: () => void;
  initialDate?: string;
}

export function NursingChartDialog({ patient, settings, onClose, onSave, initialDate }: NursingChartDialogProps) {
  const db = useDB();
  const [intervalHours, setIntervalHours] = useState<string>("2");
  const [isIcuChart, setIsIcuChart] = useState(Boolean(patient.isIcu));

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

  const [charts, setCharts] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Fetch existing charts
    apiService.nursingCharts.getByPatientId(patient.id).then((data) => {
      setCharts(data);
      if (initialDate && initialDate !== "new") {
        setSelectedDate(initialDate);
        const chart = data.find(c => c.date === initialDate);
        if (chart) loadChartData(chart);
        else clearFields();
      } else {
        const today = format(new Date(), "yyyy-MM-dd");
        setSelectedDate(today);
        clearFields();
      }
    }).catch(err => {
      console.error("Failed to load charts", err);
      const today = format(new Date(), "yyyy-MM-dd");
      setSelectedDate(today);
      clearFields();
    });
  }, [patient.id, initialDate]);

  const clearFields = () => {
    setMedRows([]);
    setNoteText("");
    setInvestigationText("");
    setIntervalHours("2");
  };

  const loadChartData = (chart: any) => {
    setIntervalHours(chart.vitalsIntervalHours.toString());
    setNoteText(chart.notes || "");
    setInvestigationText(chart.investigations || "");
    if (chart.medications) {
      setMedRows(chart.medications.map((m: any) => {
        const parseVal = (val: any) => {
          if (val === "true") return true;
          if (val === "false" || val === null) return false;
          return val;
        };
        return {
          name: m.name,
          isSyrup: m.isSyrup,
          morning: m.isSyrup ? m.morning : parseVal(m.morning),
          afternoon: m.isSyrup ? m.afternoon : parseVal(m.afternoon),
          evening: m.isSyrup ? m.evening : parseVal(m.evening),
          night: m.isSyrup ? m.night : parseVal(m.night),
        };
      }));
    } else {
      setMedRows([]);
    }
  };

  const handleDateChange = (val: string) => {
    if (val === "new") {
      const today = format(new Date(), "yyyy-MM-dd");
      setSelectedDate(today);
      clearFields();
    } else {
      setSelectedDate(val);
      const chart = charts.find(c => c.date === val);
      if (chart) {
        loadChartData(chart);
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        patientId: patient.id,
        date: selectedDate,
        vitalsIntervalHours: parseInt(intervalHours, 10),
        notes: noteText,
        investigations: investigationText,
        medications: medRows.map(m => ({
          name: m.name,
          isSyrup: m.isSyrup,
          morning: m.isSyrup ? m.morning : (m.morning ? "true" : "false"),
          afternoon: m.isSyrup ? m.afternoon : (m.afternoon ? "true" : "false"),
          evening: m.isSyrup ? m.evening : (m.evening ? "true" : "false"),
          night: m.isSyrup ? m.night : (m.night ? "true" : "false"),
        }))
      };

      const saved = await apiService.nursingCharts.save(payload);
      toast.success("Nursing chart saved successfully");

      // Update charts list
      setCharts(prev => {
        const existing = prev.findIndex(c => c.date === saved.date);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = saved;
          return updated;
        }
        return [saved, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      });

      if (onSave) {
        onSave();
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save nursing chart");
    } finally {
      setIsSaving(false);
    }
  };

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
        if (val === true) return "1";
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

    // ICU 24-Hour Observation Table for Page 2 (c:\word_hospital\ICU INDOOR SHEAT 2.docx)
    const icuHours = [
      '8 AM', '9', '10', '11', '12 PM', '1', '2', '3', '4', '5', '6', '7',
      '8', '9', '10', '11', '12 AM', '1', '2', '3', '4', '5', '6', '7'
    ];
    const pulseScales = [130, 120, 110, 100, 90, 80, 70, 60, 50, 40];
    const systolikScales = [260, 250, 240, 230, 220, 210, 200, 190, 180, 170, 160, 150, 140, 130, 120, 110, 100, 90, 80, 70];
    const daystolikScales = [110, 100, 90, 80, 70, 60, 50];

    const generateScaleSectionHtml = (title: string, scales: number[], totalRows: number) => {
      let rows = "";
      scales.forEach((scale, idx) => {
        rows += `
          <tr>
            ${idx === 0 ? `<td rowspan="${totalRows}" class="icu-param-name">${title}</td>` : ''}
            ${icuHours.map(() => '<td></td>').join('')}
            <td class="icu-scale-val">${scale}</td>
            <td></td>
            <td></td>
            <td></td>
          </tr>
        `;
      });
      rows += `
        <tr class="icu-separator-row">
          ${icuHours.map(() => '<td></td>').join('')}
          <td></td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      `;
      return rows;
    };

    let icuRowsHtml = "";
    icuRowsHtml += generateScaleSectionHtml("PULSE", pulseScales, pulseScales.length + 1);
    icuRowsHtml += generateScaleSectionHtml("SYSTOLIK", systolikScales, systolikScales.length + 1);
    icuRowsHtml += generateScaleSectionHtml("DAYSTOLIK", daystolikScales, daystolikScales.length + 1);

    ['SPo2', 'IV FLUIDS', 'INTAKE'].forEach((pName) => {
      icuRowsHtml += `
        <tr style="height: 18px;">
          <td class="icu-param-name" style="height: 18px;">${pName}</td>
          ${icuHours.map(() => '<td></td>').join('')}
          <td></td>
          <td></td>
          <td></td>
          <td></td>
        </tr>
      `;
    });

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
            .helpline-title { font-size: 14px; margin-bottom: 4px; }
            .helpline-number { font-size: 18px; font-weight: bold; }

            .page-container {
              position: relative;
              background: transparent;
            }
            .watermark {
              position: absolute;
              top: 50%;
              left: 50%;
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
              width: 80%;
              max-width: 700px;
              object-fit: contain;
              transform: rotate(-30deg);
              -webkit-transform: rotate(-30deg);
            }
            .chart-content {
              position: relative;
              z-index: 1;
              background: transparent;
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

            /* ICU Flowsheet Table */
            .icu-grid-table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }
            .icu-grid-table th {
              border: 1px solid #000;
              background: #1e293b !important;
              color: #fff !important;
              padding: 2px 1px;
              font-size: 8px;
              font-weight: bold;
              text-align: center;
              height: 18px;
            }
            .icu-grid-table td {
              border: 1px solid #94a3b8;
              height: 14.5px;
              padding: 0 1px;
              text-align: center;
              font-size: 7.5px;
              vertical-align: middle;
            }
            .icu-param-name {
              font-weight: bold;
              font-size: 8.5px;
              background: #f1f5f9 !important;
              color: #0f172a;
              text-align: center;
              border: 1.2px solid #000 !important;
              letter-spacing: 0.5px;
            }
            .icu-scale-val {
              font-weight: bold;
              font-size: 8px;
              background: #f8fafc !important;
              color: #000;
              border-left: 1.2px solid #000 !important;
              border-right: 1.2px solid #000 !important;
            }
            .icu-separator-row td {
              background: #e2e8f0 !important;
              height: 6px;
              border-top: 1.2px solid #000;
              border-bottom: 1.2px solid #000;
            }
          </style>
        </head>
        <body>
          <!-- PAGE 1: INJECTION / MEDICATION CHART -->
          <div class="page-container">
            <div class="watermark">
              <img src="${logoUrl}" alt="Watermark" onerror="this.src='/lifecare-logo.jpg'" />
            </div>
            <div class="chart-content">
              <div class="top-section">
                <div class="logo-container">
                  <img src="${logoUrl}" alt="Hospital Logo" onerror="this.src='/lifecare-logo.jpg'" />
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
          </div>

          <!-- PAGE 2: ${isIcuChart ? 'ICU INDOOR SHEET' : 'VITALS CHART'} -->
          <div class="page-container page-break">
            <div class="watermark">
              <img src="${logoUrl}" alt="Watermark" onerror="this.src='/lifecare-logo.jpg'" />
            </div>
            <div class="chart-content">
              <div class="top-section">
                <div class="logo-container">
                  <img src="${logoUrl}" alt="Hospital Logo" onerror="this.src='/lifecare-logo.jpg'" />
                </div>
                <div class="helpline-circle">
                  <span class="helpline-title">Help Line No :</span>
                  <span class="helpline-number">${helpline}</span>
                </div>
              </div>

            <div class="page-padding">
              <div class="outer-border-box">
                ${isIcuChart ? `
                <table class="header-meta-table" style="font-size: 10px;">
                  <tr>
                    <td style="width: 25%;">Morning Staff :- ________________</td>
                    <td style="width: 25%;">Afternoon Staff :- ________________</td>
                    <td style="width: 25%;">Evening Staff :- ________________</td>
                    <td style="width: 25%;">Night Staff :- ________________</td>
                  </tr>
                </table>

                <div class="patient-details-box" style="border-bottom: 2px solid #000; font-size: 10.5px; padding: 5px 8px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                    <div>Patient Name :- <span class="val">${patient.name}</span></div>
                    <div>Incharge Doctor :- <span class="val">${patient.doctor || '-'}</span></div>
                    <div>Date :- <span class="val">${dateStr}</span></div>
                    <div>Unit no :- <span class="val">${wardStr || '-'}</span></div>
                    <div>Bed no :- <span class="val">${wardNums.join(', ') || '-'}</span></div>
                  </div>
                  <div style="margin-top: 3px;">Advice :- <span class="val">${noteText || ''}</span></div>
                </div>

                <table class="icu-grid-table">
                  <thead>
                    <tr>
                      <th style="width: 9%;"></th>
                      ${icuHours.map(h => `<th style="width: 3.25%;">${h}</th>`).join('')}
                      <th style="width: 4.5%;"></th>
                      <th style="width: 3.1%;">LO</th>
                      <th style="width: 3.1%;">MD</th>
                      <th style="width: 3.1%;">HI</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${icuRowsHtml}
                  </tbody>
                </table>

                <table class="p2-footer-table" style="font-size: 10px;">
                  <tr>
                    <td style="width: 100%; padding: 6px 8px;">
                      <div style="display: flex; justify-content: space-between; margin-bottom: 5px; font-weight: bold;">
                        <span>TOTAL INTAKE :- ________________</span>
                        <span>TOTAL (ML) URIN :- ________________</span>
                        <span>STOOL :- ________________</span>
                      </div>
                      <div style="margin-bottom: 4px; font-weight: bold;">NOTE :- <span style="font-weight: normal;">${noteText || ''}</span></div>
                      <div style="font-weight: bold;">Advice :- <span style="font-weight: normal;">${investigationText || ''}</span></div>
                    </td>
                  </tr>
                </table>
                ` : `
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
                `}
              </div>
            </div>
            </div>
          </div>

          <script>
            var printed = false;
            function doPrint() {
              if (printed) return;
              printed = true;
              window.print();
            }
            window.onload = function() {
              setTimeout(doPrint, 200);
            };
            setTimeout(doPrint, 800);
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
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col p-3.5 sm:p-6 overflow-hidden">
        <DialogHeader className="pr-6 sm:pr-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div className="flex items-center gap-2 text-base sm:text-xl font-bold">
              <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
              <span className="truncate">Nursing / Vitals Chart — {patient.name}</span>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Label className="text-xs sm:text-sm whitespace-nowrap text-muted-foreground">Select Date:</Label>
              <Select value={selectedDate} onValueChange={handleDateChange}>
                <SelectTrigger className="w-36 sm:w-40 h-8 text-xs sm:text-sm">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  {charts.map(c => (
                    <SelectItem key={c.date} value={c.date} className="text-xs sm:text-sm">
                      {c.date} {c.date === format(new Date(), "yyyy-MM-dd") ? "(Today)" : ""}
                    </SelectItem>
                  ))}
                  <SelectItem value="new" className="text-primary font-semibold border-t text-xs sm:text-sm">
                    + New Chart
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 pr-1 sm:pr-2 flex-1 overflow-y-auto min-h-0">
          <div className="space-y-2 bg-muted/40 p-3 sm:p-3.5 rounded-lg border">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <Label htmlFor="interval" className="text-xs sm:text-sm font-semibold">Vitals Check Interval (Page 2)</Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="chart-is-icu"
                  checked={isIcuChart}
                  onCheckedChange={(c) => setIsIcuChart(!!c)}
                />
                <Label htmlFor="chart-is-icu" className="text-xs font-semibold cursor-pointer text-cyan-600 dark:text-cyan-400">
                  ICU Chart Sheet (Page 2 Flowsheet)
                </Label>
              </div>
            </div>
            <Select value={intervalHours} onValueChange={setIntervalHours} disabled={isIcuChart}>
              <SelectTrigger id="interval" className="h-9 sm:h-10 text-xs sm:text-sm bg-background">
                <SelectValue placeholder="Select interval" />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto">
                {Array.from({ length: 24 }, (_, i) => i + 1).map((hr) => (
                  <SelectItem key={hr} value={hr.toString()} className="text-xs sm:text-sm">
                    Every {hr} {hr === 1 ? "Hour" : "Hours"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">
              {isIcuChart
                ? "ICU Mode Active: Page 2 prints the 24-Hour Intensive Care Flowsheet (Pulse, Systolik, Daystolik, SPo2, IV Fluids, Intake)."
                : `Time column on Page 2 starts from admission (${new Date(patient.registeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}) up to the 8-to-8 shift boundary.`
              }
            </p>
          </div>

          <div className="border rounded-lg p-3 sm:p-4 space-y-2.5 sm:space-y-3 bg-muted/20">
            <div className="flex items-center justify-between gap-2">
              <div>
                <Label className="text-sm sm:text-base font-semibold">Page 1: Injections / Medications</Label>
                <p className="text-[11px] sm:text-xs text-muted-foreground">Add or edit prescribed medications for the chart</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addMedRow} className="h-8 text-xs px-2.5 gap-1 shrink-0">
                <Plus className="h-3.5 w-3.5" /> <span className="hidden xs:inline">Add</span> Medication
              </Button>
            </div>

            {medRows.length === 0 ? (
              <div className="text-xs text-muted-foreground italic py-3 text-center border border-dashed rounded-md bg-background">
                No medicines added yet. Click "+ Add Medication" to add medicines or print a blank chart.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {medRows.map((row, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center bg-background p-2.5 rounded-md border shadow-xs">
                    <div className="flex-1 min-w-0">
                      <MedicineSearchInput
                        value={row.name}
                        onChange={(val, isSyrupCat) => {
                          updateMedRow(idx, "name", val);
                          if (isSyrupCat !== undefined) {
                            updateMedRow(idx, "isSyrup", isSyrupCat);
                          }
                        }}
                      />
                    </div>

                    {/* Dosage slot controls: Checkboxes for Tablets/Injections, ML Text Inputs for Syrups */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-border/40">
                      {row.isSyrup ? (
                        <div className="grid grid-cols-4 gap-1 shrink-0">
                          <Input placeholder="M (ml)" value={typeof row.morning === "string" ? row.morning : ""} onChange={(e) => updateMedRow(idx, "morning", e.target.value)} className="w-14 sm:w-16 h-7 sm:h-8 text-[11px] sm:text-xs text-center font-medium px-1" title="Morning ml" />
                          <Input placeholder="A (ml)" value={typeof row.afternoon === "string" ? row.afternoon : ""} onChange={(e) => updateMedRow(idx, "afternoon", e.target.value)} className="w-14 sm:w-16 h-7 sm:h-8 text-[11px] sm:text-xs text-center font-medium px-1" title="Afternoon ml" />
                          <Input placeholder="E (ml)" value={typeof row.evening === "string" ? row.evening : ""} onChange={(e) => updateMedRow(idx, "evening", e.target.value)} className="w-14 sm:w-16 h-7 sm:h-8 text-[11px] sm:text-xs text-center font-medium px-1" title="Evening ml" />
                          <Input placeholder="N (ml)" value={typeof row.night === "string" ? row.night : ""} onChange={(e) => updateMedRow(idx, "night", e.target.value)} className="w-14 sm:w-16 h-7 sm:h-8 text-[11px] sm:text-xs text-center font-medium px-1" title="Night ml" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 shrink-0 px-2 sm:border-l sm:border-r">
                          <label className="flex items-center sm:flex-col gap-1 sm:gap-0.5 cursor-pointer text-[10px] font-semibold text-muted-foreground">
                            <span>M</span>
                            <input
                              type="checkbox"
                              checked={!!row.morning}
                              onChange={(e) => updateMedRow(idx, "morning", e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer"
                            />
                          </label>
                          <label className="flex items-center sm:flex-col gap-1 sm:gap-0.5 cursor-pointer text-[10px] font-semibold text-muted-foreground">
                            <span>A</span>
                            <input
                              type="checkbox"
                              checked={!!row.afternoon}
                              onChange={(e) => updateMedRow(idx, "afternoon", e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer"
                            />
                          </label>
                          <label className="flex items-center sm:flex-col gap-1 sm:gap-0.5 cursor-pointer text-[10px] font-semibold text-muted-foreground">
                            <span>E</span>
                            <input
                              type="checkbox"
                              checked={!!row.evening}
                              onChange={(e) => updateMedRow(idx, "evening", e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer"
                            />
                          </label>
                          <label className="flex items-center sm:flex-col gap-1 sm:gap-0.5 cursor-pointer text-[10px] font-semibold text-muted-foreground">
                            <span>N</span>
                            <input
                              type="checkbox"
                              checked={!!row.night}
                              onChange={(e) => updateMedRow(idx, "night", e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer"
                            />
                          </label>
                        </div>
                      )}

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                        onClick={() => removeMedRow(idx)}
                        title="Remove medication"
                      >
                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border rounded-lg p-3 sm:p-4 space-y-2.5 sm:space-y-3 bg-muted/20">
            <Label className="text-sm sm:text-base font-semibold">Page 1: Notes &amp; Investigations</Label>
            <div className="grid sm:grid-cols-2 gap-2.5 sm:gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Note</Label>
                <Input placeholder="Special care / instructions..." value={noteText} onChange={(e) => setNoteText(e.target.value)} className="h-8 sm:h-9 text-xs bg-background" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Investigations</Label>
                <Input placeholder="CBC, X-Ray, ECG..." value={investigationText} onChange={(e) => setInvestigationText(e.target.value)} className="h-8 sm:h-9 text-xs bg-background" />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t shrink-0">
          <Button variant="outline" onClick={onClose} className="h-8 sm:h-9 text-xs sm:text-sm w-full sm:w-auto">
            Cancel
          </Button>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="secondary" onClick={handleSave} disabled={isSaving} className="h-8 sm:h-9 text-xs sm:text-sm flex-1 sm:flex-initial">
              {isSaving ? "Saving..." : "Save Chart"}
            </Button>
            <Button onClick={async () => { await handleSave(); handlePrint(); }} className="h-8 sm:h-9 text-xs sm:text-sm gap-1.5 px-4 flex-1 sm:flex-initial">
              <Printer className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Save & Print
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
