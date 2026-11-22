import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef } from "react";
import { ChargeCombobox } from "@/components/ChargeCombobox";
import {
  FlaskConical,
  Search,
  Plus,
  Trash2,
  Printer,
  FileText,
  User,
  Loader2,
  Calendar,
  CheckCircle2,
  DollarSign
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RoleGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useDB } from "@/lib/useStore";
import { receptionService } from "@/services/receptionService";
import { apiService } from "@/api/apiService";
import type { Patient } from "@/lib/store";
import numberToWords from "number-to-words";

export const Route = createFileRoute("/laboratory")({
  head: () => ({
    meta: [
      { title: "Laboratory — MediCore HMS" },
      { name: "description", content: "Laboratory billing and test management." },
    ],
  }),
  component: () => (
    <RequireAuth module="Laboratory" action="Access">
      <AppShell>
        <LaboratoryPage />
      </AppShell>
    </RequireAuth>
  ),
});

interface LabItemRow {
  description: string;
  qty: string;
  charges: number;
  totalCharges: number;
}

interface SavedLabBill {
  id: string;
  receiptNo: string;
  billDate: string;
  patientType: "IPD" | "OPD" | "Walk-in";
  patientId?: string;
  patientCode: string;
  patientName: string;
  patientAge?: string | number;
  patientGender?: string;
  patientPhone?: string;
  doctor?: string;
  ward?: string;
  bed?: string;
  subtotal: number;
  discountType: "flat" | "percent";
  discountValue: number;
  discountAmount: number;
  netAmount: number;
  items: {
    description: string;
    qty: number;
    charges: number;
    totalCharges: number;
  }[];
  createdAt: string;
}

const LOCAL_LAB_BILLS_KEY = "lifecare_lab_bills_history";

function getLocalLabBills(): SavedLabBill[] {
  try {
    const raw = localStorage.getItem(LOCAL_LAB_BILLS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalLabBill(bill: SavedLabBill) {
  try {
    const current = getLocalLabBills();
    const updated = [bill, ...current.filter((b) => b.id !== bill.id)];
    localStorage.setItem(LOCAL_LAB_BILLS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error("Failed to save lab bill locally", err);
  }
}

function LaboratoryPage() {
  const db = useDB();
  const [activeTab, setActiveTab] = useState("billing");

  // Patient selection / Walk-in state
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(-1);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Walk-in fields
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");
  const [walkInAge, setWalkInAge] = useState("");
  const [walkInGender, setWalkInGender] = useState("Male");
  const [walkInDoctor, setWalkInDoctor] = useState("");

  // Bill fields
  const [billDate, setBillDate] = useState(new Date().toISOString().split("T")[0]);
  const [receiptNo, setReceiptNo] = useState(`LAB-${Date.now().toString().slice(-6)}`);
  const [items, setItems] = useState<LabItemRow[]>([
    { description: "", qty: "1", charges: 0, totalCharges: 0 },
  ]);
  const [discountType, setDiscountType] = useState<"flat" | "percent">("flat");
  const [discountValue, setDiscountValue] = useState("0");
  const [isSaving, setIsSaving] = useState(false);

  // View / Print modal state
  const [printBill, setPrintBill] = useState<SavedLabBill | null>(null);

  // History state
  const [history, setHistory] = useState<SavedLabBill[]>([]);
  const [historySearch, setHistorySearch] = useState("");

  // New Test modal state
  const [newTestOpen, setNewTestOpen] = useState(false);
  const [newTestName, setNewTestName] = useState("");
  const [newTestAmount, setNewTestAmount] = useState("");
  const [isCreatingTest, setIsCreatingTest] = useState(false);

  useEffect(() => {
    setHistory(getLocalLabBills());
  }, []);

  // Autocomplete patient search
  useEffect(() => {
    if (patientSearch.trim().length >= 2 && !isWalkIn) {
      const timer = setTimeout(async () => {
        try {
          const res = await receptionService.searchPatient(patientSearch.trim(), true);
          setSearchResults(res || []);
          setShowSearchResults(true);
          setActiveSearchIndex(-1);
        } catch {
          setSearchResults([]);
        }
      }, 250);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
      setActiveSearchIndex(-1);
    }
  }, [patientSearch, isWalkIn]);

  const handleSelectPatient = (p: Patient) => {
    setSelectedPatient(p);
    setPatientSearch(`${p.name} (${p.code})`);
    setShowSearchResults(false);
    setReceiptNo(`LAB-${p.id || p.code}-${Date.now().toString().slice(-4)}`);
  };

  const handlePatientKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSearchResults || searchResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSearchIndex((prev) => (prev + 1) % searchResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSearchIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeSearchIndex >= 0 && activeSearchIndex < searchResults.length) {
        handleSelectPatient(searchResults[activeSearchIndex]);
      }
    } else if (e.key === "Escape") {
      setShowSearchResults(false);
    }
  };

  // Only display charges belonging to "Lab Bill" category
  const labCharges = useMemo(() => {
    return db.charges.filter((c) => c.category === "Lab Bill");
  }, [db.charges]);

  const addItemRow = () => {
    setItems([...items, { description: "", qty: "1", charges: 0, totalCharges: 0 }]);
  };

  const removeItemRow = (idx: number) => {
    if (items.length <= 1) {
      setItems([{ description: "", qty: "1", charges: 0, totalCharges: 0 }]);
      return;
    }
    setItems(items.filter((_, i) => i !== idx));
  };

  const updateItemRow = (idx: number, field: keyof LabItemRow, val: any) => {
    const next = [...items];
    const row = { ...next[idx], [field]: val };

    if (field === "description") {
      const match = db.charges.find((c) => c.name.toLowerCase() === String(val).toLowerCase());
      if (match) {
        row.charges = match.amount;
        row.totalCharges = match.amount * (Number(row.qty) || 1);
      }
    } else if (field === "qty" || field === "charges") {
      const q = field === "qty" ? Number(val) || 0 : Number(row.qty) || 0;
      const c = field === "charges" ? Number(val) || 0 : Number(row.charges) || 0;
      row.totalCharges = q * c;
    }

    next[idx] = row;
    setItems(next);
  };

  // Totals calculations
  const subtotal = items.reduce((sum, it) => sum + (Number(it.totalCharges) || 0), 0);
  const dv = Number(discountValue) || 0;
  const discountAmount = discountType === "flat" ? dv : (subtotal * dv) / 100;
  const netAmount = Math.max(0, subtotal - discountAmount);

  const resetForm = () => {
    setSelectedPatient(null);
    setPatientSearch("");
    setWalkInName("");
    setWalkInPhone("");
    setWalkInAge("");
    setWalkInDoctor("");
    setReceiptNo(`LAB-${Date.now().toString().slice(-6)}`);
    setItems([{ description: "", qty: "1", charges: 0, totalCharges: 0 }]);
    setDiscountValue("0");
  };

  const handleCreateNewTest = async () => {
    if (!newTestName.trim()) {
      toast.error("Please enter a test name");
      return;
    }
    const amount = Number(newTestAmount) || 0;
    setIsCreatingTest(true);
    try {
      await apiService.charges.create({
        name: newTestName.trim(),
        category: "Lab Bill",
        amount,
      });
      toast.success("Lab test added to catalog");
      setNewTestOpen(false);
      setNewTestName("");
      setNewTestAmount("");
    } catch (err: any) {
      toast.error(err?.message || "Failed to add test");
    } finally {
      setIsCreatingTest(false);
    }
  };

  // Submit and save bill
  const handleSaveBill = async () => {
    if (isSaving) return;

    if (!isWalkIn && !selectedPatient) {
      toast.error("Please select a registered patient or switch to Walk-in");
      return;
    }

    if (isWalkIn && !walkInName.trim()) {
      toast.error("Please enter patient name for walk-in customer");
      return;
    }

    const validItems = items.filter((it) => it.description.trim() !== "");
    if (validItems.length === 0) {
      toast.error("Please select at least one laboratory test procedure");
      return;
    }

    setIsSaving(true);
    try {
      const patientType = isWalkIn
        ? "Walk-in"
        : selectedPatient?.ward
        ? "IPD"
        : "OPD";

      const billRecord: SavedLabBill = {
        id: `bill-${Date.now()}`,
        receiptNo,
        billDate,
        patientType,
        patientId: isWalkIn ? undefined : String(selectedPatient?.id || ""),
        patientCode: isWalkIn ? "WALK-IN" : selectedPatient?.code || "",
        patientName: isWalkIn ? walkInName.trim() : selectedPatient?.name || "",
        patientAge: isWalkIn ? walkInAge : selectedPatient?.age,
        patientGender: isWalkIn ? walkInGender : selectedPatient?.gender,
        patientPhone: isWalkIn ? walkInPhone : selectedPatient?.phone,
        doctor: isWalkIn ? walkInDoctor : selectedPatient?.doctor || "",
        ward: !isWalkIn ? selectedPatient?.ward : undefined,
        bed: !isWalkIn ? selectedPatient?.wardNumber : undefined,
        subtotal,
        discountType,
        discountValue: dv,
        discountAmount,
        netAmount,
        items: validItems.map((it) => ({
          description: it.description,
          qty: Number(it.qty) || 1,
          charges: Number(it.charges) || 0,
          totalCharges: Number(it.totalCharges) || 0,
        })),
        createdAt: new Date().toISOString(),
      };

      // Try backend api if registered patient
      if (!isWalkIn && selectedPatient?.id) {
        try {
          const payload = {
            patientId: selectedPatient.id,
            receiptNo,
            billDate,
            ward: selectedPatient.ward || "General",
            bedCategory: selectedPatient.wardNumber
              ? `General/${selectedPatient.wardNumber}`
              : "General",
            totalAmount: subtotal,
            discountAmount,
            netAmount,
            items: validItems.map((it) => ({
              description: it.description,
              daysQty: Number(it.qty) || 1,
              charges: Number(it.charges) || 0,
              totalCharges: Number(it.totalCharges) || 0,
            })),
          };
          await apiService.labBills.create(payload);
        } catch (apiErr) {
          console.warn("Backend lab bill save fallback:", apiErr);
        }
      }

      saveLocalLabBill(billRecord);
      setHistory(getLocalLabBills());
      toast.success(`Lab bill generated — ${receiptNo}`);
      setPrintBill(billRecord);
      resetForm();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Failed to create lab bill");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    let printIframe = document.getElementById("lab-print-iframe") as HTMLIFrameElement;
    if (!printIframe) {
      printIframe = document.createElement("iframe");
      printIframe.id = "lab-print-iframe";
      printIframe.style.position = "fixed";
      printIframe.style.top = "-9999px";
      printIframe.style.left = "-9999px";
      printIframe.style.width = "0";
      printIframe.style.height = "0";
      printIframe.style.border = "none";
      document.body.appendChild(printIframe);
    }
    const printWindow = printIframe.contentWindow;
    if (!printWindow || !printBill) return;

    const settings = db.hospitalSettings;
    const logoUrl =
      settings?.logoUrl && settings.logoUrl !== "/logo.png" && settings.logoUrl !== "/logo.jpg"
        ? settings.logoUrl
        : "/lifecare-logo.jpg";
    const helpline = settings?.helpline || "7016124362";

    const inWords =
      printBill.netAmount > 0
        ? numberToWords.toWords(Math.round(printBill.netAmount)).replace(/\b\w/g, (c) => c.toUpperCase()) + " Only."
        : "Zero Only.";

    const fillerCount = Math.max(0, 8 - printBill.items.length);
    const fillerRows = Array.from({ length: fillerCount })
      .map(
        () => `
        <tr>
          <td class="filler-cell border-r"></td>
          <td class="filler-cell border-r"></td>
          <td class="filler-cell border-r"></td>
          <td class="filler-cell border-r"></td>
          <td class="filler-cell"></td>
        </tr>
      `
      )
      .join("");

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Laboratory Bill - ${printBill.receiptNo}</title>
          <style>
            @page { margin: 0; size: A4; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            html, body {
              margin: 0;
              padding: 0;
              background: #fff;
              font-family: Arial, Helvetica, sans-serif;
              color: #000;
              font-size: 11px;
            }
            .watermark {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-12deg);
              -webkit-transform: translate(-50%, -50%) rotate(-12deg);
              opacity: 0.13;
              z-index: 0;
              pointer-events: none;
              width: 80%;
              max-width: 600px;
              text-align: center;
            }
            .watermark img {
              width: 100%;
              object-fit: contain;
            }
            .page-container {
              position: relative;
              z-index: 1;
              width: 100%;
              max-width: 800px;
              margin: 0 auto;
              padding: 12px 24px;
              box-sizing: border-box;
            }
            .top-section {
              background-color: #4b4b4b !important;
              margin: 15px 15px 25px 15px;
              border-radius: 40px;
              display: flex;
              align-items: center;
              justify-content: space-between;
              height: 120px;
              position: relative;
              border: 1px solid black;
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
              border: 1px solid black;
              overflow: hidden;
            }
            .logo-container img {
              width: 100%;
              height: 100%;
              border-radius: 40px 0 0 40px;
              object-fit: fill;
            }
            .helpline-circle {
              background-color: white !important;
              width: 150px;
              height: 150px;
              border-radius: 50%;
              position: absolute;
              right: 18px;
              top: 50%;
              transform: translateY(-50%);
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              box-shadow: 0 4px 10px rgba(0,0,0,0.15);
              z-index: 10;
              border: 1px solid black;
            }
            .helpline-title {
              font-size: 13px;
              margin-bottom: 2px;
              color: #e53e3e;
            }
            .helpline-number {
              font-size: 17px;
              font-weight: bold;
              color: #e53e3e;
            }

            .patient-box {
              border: 1px solid black;
              padding: 8px;
              font-size: 11px;
              margin-bottom: 15px;
              text-transform: uppercase;
              display: flex;
              flex-direction: row;
            }
            .patient-left {
              width: 66.666%;
              padding-right: 14px;
              border-right: 1px solid black;
              display: flex;
              flex-direction: column;
              gap: 8px;
            }
            .patient-left-row {
              display: flex;
              gap: 12px;
            }
            .line-fill {
              border-bottom: 1px dotted black;
              padding-bottom: 2px;
            }
            .patient-right {
              width: 33.333%;
              padding-left: 14px;
              font-size: 10px;
              line-height: 1.4;
              font-weight: bold;
              display: flex;
              flex-direction: column;
              gap: 3px;
            }
            .patient-right-row {
              display: grid;
              grid-template-columns: 100px 1fr;
            }

            .bill-title {
              text-align: center;
              font-weight: bold;
              color: #dc2626;
              font-size: 13px;
              padding: 4px;
              margin-bottom: 8px;
              letter-spacing: 1px;
              border: 1px solid black;
            }

            .table-wrap {
              border: 1px solid black;
              margin-bottom: 8px;
            }
            .lab-table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }
            .lab-table thead tr {
              color: #dc2626;
              border-bottom: 1px solid black;
            }
            .lab-table th {
              padding: 4px 8px;
              font-weight: normal;
              text-align: left;
            }
            .lab-table td {
              padding: 4px 8px;
            }
            .border-r {
              border-right: 1px solid black;
            }
            .filler-cell {
              padding: 12px 8px;
            }

            .totals-box {
              border: 1px solid black;
              margin-bottom: 8px;
              font-size: 11px;
              display: flex;
              flex-direction: row;
            }
            .bank-details {
              width: 50%;
              padding: 8px;
              border-right: 1px solid black;
              color: #dc2626;
            }
            .bank-details .bank-title {
              font-weight: bold;
              margin-bottom: 4px;
              text-transform: uppercase;
              color: black;
            }
            .bank-row {
              display: grid;
              grid-template-columns: 110px 1fr;
              margin-bottom: 2px;
            }
            .calc-details {
              width: 50%;
              padding: 8px;
              display: flex;
              flex-direction: column;
              justify-content: center;
              gap: 6px;
              color: #dc2626;
              font-weight: bold;
            }
            .calc-line {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding-right: 12px;
            }
            .calc-net {
              border-top: 1px solid #dc2626;
              padding-top: 4px;
              font-size: 14px;
            }

            .words-box {
              border: 1px solid black;
              padding: 6px 8px;
              font-size: 11px;
              font-weight: bold;
              margin-bottom: 20px;
              color: black;
            }
            .words-box span {
              font-weight: normal;
              text-transform: capitalize;
            }

            .signature-box {
              display: flex;
              justify-content: space-between;
              margin-top: 55px;
              padding: 0 16px;
              font-size: 11px;
              font-weight: bold;
              color: black;
            }
            .signature-item {
              border-bottom: 1px solid black;
              padding-bottom: 4px;
              padding-left: 16px;
              padding-right: 16px;
            }
          </style>
        </head>
        <body>
          <div class="watermark">
            <img src="${logoUrl}" alt="Watermark" onerror="this.src='/lifecare-logo.jpg'" />
          </div>

          <div class="page-container">
            <div class="top-section">
              <div class="logo-container">
                <img src="${logoUrl}" alt="Hospital Logo" onerror="this.src='/lifecare-logo.jpg'" />
              </div>
              <div class="helpline-circle">
                <span class="helpline-title">Help Line :</span>
                <span class="helpline-number">${helpline}</span>
              </div>
            </div>

            <div class="patient-box">
              <div class="patient-left">
                <div class="patient-left-row">
                  <div class="line-fill" style="flex: 1;">Pt.NAME - <span style="font-weight: bold;">${printBill.patientName}</span></div>
                  <div class="line-fill" style="width: 190px;">AGE / GENDER - <span style="font-weight: bold;">${printBill.patientAge ? `${printBill.patientAge} / ${printBill.patientGender}` : "-"}</span></div>
                </div>
                <div class="patient-left-row">
                  <div class="line-fill" style="flex: 1;">Dr. IN-CHARGE - <span style="font-weight: bold;">${printBill.doctor || "-"}</span></div>
                  <div class="line-fill" style="width: 190px;">ADDMITION - <span style="font-weight: bold;">${new Date(printBill.billDate).toLocaleDateString("en-GB")}</span></div>
                </div>
                <div class="patient-left-row">
                  <div class="line-fill" style="flex: 1;">ADDRESH - <span style="font-weight: bold;">${printBill.patientPhone || "-"}</span></div>
                  <div class="line-fill" style="width: 190px;">DISEASE - <span style="font-weight: bold;">-</span></div>
                </div>
              </div>
              <div class="patient-right">
                <div class="patient-right-row"><span>Admission No</span> <span>- ${printBill.patientCode || "-"}</span></div>
                <div class="patient-right-row"><span>Indoor No</span> <span>- ${printBill.patientCode || "-"}</span></div>
                <div class="patient-right-row"><span>RECEIPT No</span> <span>- ${printBill.receiptNo}</span></div>
                <div class="patient-right-row"><span>Bill Date</span> <span>- ${new Date(printBill.billDate).toLocaleDateString("en-GB")}</span></div>
                <div class="patient-right-row"><span>Discharge Date</span> <span>- -</span></div>
                <div class="patient-right-row"><span>Ward</span> <span>- ${printBill.ward || (printBill.patientType === "Walk-in" ? "Walk-in" : "OPD")}</span></div>
                <div class="patient-right-row"><span>Bed Category</span> <span>- ${printBill.bed || "-"}</span></div>
              </div>
            </div>

            <div class="bill-title">
              LABORATORY INVESTIGATION &amp; DIAGNOSTICS BILL
            </div>

            <div class="table-wrap">
              <table class="lab-table">
                <thead>
                  <tr>
                    <th style="width: 40px;" class="border-r">NO</th>
                    <th class="border-r">Particular Procedure</th>
                    <th style="width: 90px; text-align: center;" class="border-r">Days / Qty</th>
                    <th style="width: 100px; text-align: center;" class="border-r">Charges</th>
                    <th style="width: 110px; text-align: center;">Total Charges</th>
                  </tr>
                </thead>
                <tbody>
                  ${printBill.items.map((it, idx) => `
                    <tr>
                      <td class="border-r" style="text-decoration: underline; vertical-align: top;">${idx + 1}</td>
                      <td class="border-r" style="font-weight: bold;">${it.description}</td>
                      <td class="border-r" style="text-align: center;">${it.qty}</td>
                      <td class="border-r" style="text-align: center;">${Number(it.charges).toLocaleString('en-IN')}</td>
                      <td style="text-align: center;">${Number(it.totalCharges).toLocaleString('en-IN')}</td>
                    </tr>
                  `).join("")}
                  ${fillerRows}
                </tbody>
              </table>
            </div>

            <div class="totals-box">
              <div class="bank-details">
                <div class="bank-title">BANK DETAILS</div>
                <div class="bank-row"><span>Account Name</span> <span>— ${settings?.bankAccountName || 'Lifecare Hospital'}</span></div>
                <div class="bank-row"><span>A / C No</span> <span>— ${settings?.bankAccountNumber || '20444583179'}</span></div>
                <div class="bank-row"><span>BANK NAME</span> <span>— ${settings?.bankName || 'SBI BANK'}</span></div>
                <div class="bank-row"><span>IFSE Code</span> <span>— ${settings?.bankIfscCode || 'SBIN0000463'}</span></div>
              </div>
              <div class="calc-details">
                <div class="calc-line">
                  <span>Total Amount</span>
                  <span>=</span>
                  <span style="width: 90px; text-align: right;">${Number(printBill.subtotal).toLocaleString('en-IN')} /-</span>
                </div>
                <div class="calc-line">
                  <span>Less : Deposit</span>
                  <span>=</span>
                  <span style="width: 90px; text-align: right;">-</span>
                </div>
                <div class="calc-line">
                  <span>Discount Amount</span>
                  <span>=</span>
                  <span style="width: 90px; text-align: right;">${printBill.discountAmount > 0 ? Number(printBill.discountAmount).toLocaleString('en-IN') : "-"}</span>
                </div>
                <div class="calc-line calc-net">
                  <span>Net Amount</span>
                  <span>=</span>
                  <span style="width: 90px; text-align: right; font-size: 15px;">${Number(printBill.netAmount).toLocaleString('en-IN')} /-</span>
                </div>
              </div>
            </div>

            <div class="words-box">
              Amount In Words — <span>${inWords}</span>
            </div>

            <div class="signature-box">
              <div class="signature-item">RELATIVE / PATIENT SIGNETURE</div>
              <div class="signature-item">AUTHORISED SIGNATURE</div>
            </div>
          </div>

          <script>
            window.addEventListener('load', function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 300);
            });
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(content);
    printWindow.document.close();
  };

  const filteredHistory = history.filter((b) => {
    const q = historySearch.toLowerCase();
    return (
      b.patientName.toLowerCase().includes(q) ||
      b.receiptNo.toLowerCase().includes(q) ||
      b.patientCode.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center">
              <FlaskConical className="h-5 w-5" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Laboratory &amp; Diagnostics</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Generate and manage separate laboratory investigation bills for IPD and Walk-in patients.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setNewTestOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Lab Test
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full sm:w-[420px] grid-cols-2">
          <TabsTrigger value="billing">
            <FileText className="h-4 w-4 mr-2" /> New Lab Bill
          </TabsTrigger>
          <TabsTrigger value="history">
            <Calendar className="h-4 w-4 mr-2" /> Bill History ({history.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: New Lab Bill */}
        <TabsContent value="billing" className="space-y-4">
          <Card className="shadow-sm">
            <CardContent className="p-5 space-y-6">
              {/* Patient Selection Header */}
              <div className="border-b pb-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="lab-walkin-toggle"
                      checked={isWalkIn}
                      onCheckedChange={(c) => {
                        setIsWalkIn(c);
                        if (c) {
                          setSelectedPatient(null);
                          setPatientSearch("");
                          setReceiptNo(`LAB-WALKIN-${Date.now().toString().slice(-4)}`);
                        } else {
                          setReceiptNo(`LAB-${Date.now().toString().slice(-6)}`);
                        }
                      }}
                    />
                    <Label htmlFor="lab-walkin-toggle" className="text-xs sm:text-sm font-semibold cursor-pointer">
                      Walk-in Patient (Separate External Billing)
                    </Label>
                  </div>

                  <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 text-sm w-full sm:w-auto">
                    <div className="space-y-1 sm:space-y-0 sm:flex sm:items-center sm:gap-1.5">
                      <Label className="text-[10px] sm:text-xs text-muted-foreground block sm:inline">Receipt No:</Label>
                      <Input
                        value={receiptNo}
                        onChange={(e) => setReceiptNo(e.target.value)}
                        className="h-8 w-full sm:w-44 font-mono font-semibold text-xs"
                      />
                    </div>
                    <div className="space-y-1 sm:space-y-0 sm:flex sm:items-center sm:gap-1.5">
                      <Label className="text-[10px] sm:text-xs text-muted-foreground block sm:inline">Bill Date:</Label>
                      <Input
                        type="date"
                        value={billDate}
                        onChange={(e) => setBillDate(e.target.value)}
                        className="h-8 w-full sm:w-36 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {isWalkIn ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-muted/30 p-3.5 rounded-lg border">
                    <div>
                      <Label className="text-xs font-semibold">Patient Name *</Label>
                      <Input
                        value={walkInName}
                        onChange={(e) => setWalkInName(e.target.value)}
                        placeholder="Enter full name"
                        className="h-9 mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Mobile Number</Label>
                      <Input
                        value={walkInPhone}
                        maxLength={10}
                        onChange={(e) => setWalkInPhone(e.target.value.replace(/\D/g, ""))}
                        placeholder="10-digit mobile"
                        className="h-9 mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Age</Label>
                      <Input
                        value={walkInAge}
                        type="number"
                        onChange={(e) => setWalkInAge(e.target.value)}
                        placeholder="Age"
                        className="h-9 mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Gender</Label>
                      <Select value={walkInGender} onValueChange={setWalkInGender}>
                        <SelectTrigger className="h-9 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Ref Doctor</Label>
                      <Input
                        value={walkInDoctor}
                        onChange={(e) => setWalkInDoctor(e.target.value)}
                        placeholder="Dr. Name"
                        className="h-9 mt-1"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative w-full max-w-md">
                      <Label className="text-xs font-semibold mb-1 block">
                        Search Registered / IPD Patient:
                      </Label>
                      <div className="relative">
                        <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={patientSearch}
                          onChange={(e) => setPatientSearch(e.target.value)}
                          onFocus={() => setShowSearchResults(true)}
                          onKeyDown={handlePatientKeyDown}
                          placeholder="Search patient code (e.g. P-2026-00015) or name..."
                          className="pl-9 h-9"
                        />
                      </div>

                      {showSearchResults && searchResults.length > 0 && (
                        <div className="absolute top-full left-0 mt-1 w-full bg-popover text-popover-foreground rounded-md border shadow-lg z-50 overflow-hidden max-h-60 overflow-y-auto">
                          {searchResults.map((p, idx) => (
                            <div
                              key={p.id}
                              className={`px-3 py-2 text-sm hover:bg-muted cursor-pointer transition-colors flex items-center justify-between ${
                                idx === activeSearchIndex ? "bg-muted font-medium" : ""
                              }`}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                handleSelectPatient(p);
                              }}
                            >
                              <div>
                                <span className="font-semibold">{p.name}</span>{" "}
                                <span className="text-xs text-muted-foreground">({p.code})</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {p.ward && (
                                  <Badge variant="outline" className="text-[10px] bg-teal-50 text-teal-700">
                                    IPD: {p.ward} ({p.wardNumber || "-"})
                                  </Badge>
                                )}
                                <span className="text-xs text-muted-foreground">{p.doctor}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {selectedPatient && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 bg-muted/40 p-3.5 rounded-lg border text-xs">
                        <div>
                          <span className="text-muted-foreground block">Patient Name:</span>
                          <strong className="text-sm">{selectedPatient.name}</strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Code:</span>
                          <strong className="text-sm text-teal-600">{selectedPatient.code}</strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Age / Gender:</span>
                          <span>{selectedPatient.age} / {selectedPatient.gender}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Ward / Bed:</span>
                          <span>
                            {selectedPatient.ward ? `${selectedPatient.ward} / ${selectedPatient.wardNumber || "-"}` : "OPD"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Attending Doctor:</span>
                          <span>{selectedPatient.doctor || "-"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Mobile:</span>
                          <span>{selectedPatient.phone}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Lab Tests Table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-teal-600" />
                    Investigation Procedures &amp; Test Charges
                  </h3>
                  <Button variant="outline" size="sm" onClick={addItemRow}>
                    <Plus className="h-4 w-4 mr-1.5" /> Add Row
                  </Button>
                </div>

                {/* Desktop Table View */}
                <div className="rounded-md border overflow-visible hidden md:block">
                  <Table className="overflow-visible">
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="w-[50px] text-center">#</TableHead>
                        <TableHead className="min-w-[280px]">Test / Procedure Particular</TableHead>
                        <TableHead className="w-[120px]">Qty / Days</TableHead>
                        <TableHead className="w-[140px]">Charges (₹)</TableHead>
                        <TableHead className="w-[140px]">Total (₹)</TableHead>
                        <TableHead className="w-[60px] text-center">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="overflow-visible">
                      {items.map((it, idx) => (
                        <TableRow key={idx} className="overflow-visible">
                          <TableCell className="text-center font-medium text-xs text-muted-foreground">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="overflow-visible relative min-w-[280px]">
                            <ChargeCombobox
                              value={it.description}
                              onChange={(val, matchedAmount) => {
                                const next = [...items];
                                const row = { ...next[idx], description: val };
                                if (matchedAmount !== undefined) {
                                  row.charges = matchedAmount;
                                  row.totalCharges = matchedAmount * (Number(row.qty) || 1);
                                }
                                next[idx] = row;
                                setItems(next);
                              }}
                              options={labCharges}
                              placeholder="Type or select lab test..."
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={it.qty}
                              onChange={(e) => updateItemRow(idx, "qty", e.target.value)}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              value={it.charges}
                              onChange={(e) => updateItemRow(idx, "charges", e.target.value)}
                              className="h-8"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={it.totalCharges}
                              readOnly
                              className="h-8 bg-muted font-semibold text-teal-700"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeItemRow(idx)}
                              className="h-7 w-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards for Lab Tests */}
                <div className="space-y-2.5 md:hidden">
                  {items.map((it, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border bg-card p-3 shadow-xs space-y-2.5"
                    >
                      {/* Top: # Number, Test Combobox, Delete button */}
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-muted-foreground w-5 text-center shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <ChargeCombobox
                            value={it.description}
                            onChange={(val, matchedAmount) => {
                              const next = [...items];
                              const row = { ...next[idx], description: val };
                              if (matchedAmount !== undefined) {
                                row.charges = matchedAmount;
                                row.totalCharges = matchedAmount * (Number(row.qty) || 1);
                              }
                              next[idx] = row;
                              setItems(next);
                            }}
                            options={labCharges}
                            placeholder="Type or select lab test..."
                          />
                        </div>
                        {items.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItemRow(idx)}
                            className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 shrink-0"
                            title="Remove test"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>

                      {/* Inputs Row: Qty, Charges, Total */}
                      <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-border/50">
                        <div>
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide block">Qty / Days</Label>
                          <Input
                            type="number"
                            min="1"
                            value={it.qty}
                            onChange={(e) => updateItemRow(idx, "qty", e.target.value)}
                            className="h-8 text-xs font-medium mt-0.5"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide block">Rate (₹)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={it.charges}
                            onChange={(e) => updateItemRow(idx, "charges", e.target.value)}
                            className="h-8 text-xs font-medium mt-0.5"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground uppercase tracking-wide block">Total (₹)</Label>
                          <Input
                            type="number"
                            value={it.totalCharges}
                            readOnly
                            className="h-8 text-xs bg-muted font-bold text-teal-700 mt-0.5"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discount & Totals Calculation */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-4 border-t">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-semibold">Discount Type:</Label>
                    <Select
                      value={discountType}
                      onValueChange={(v: "flat" | "percent") => setDiscountType(v)}
                    >
                      <SelectTrigger className="h-8 w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="flat">Flat (₹)</SelectItem>
                        <SelectItem value="percent">Percentage (%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs font-semibold">Discount Value:</Label>
                    <Input
                      type="number"
                      min="0"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      className="h-8 w-24"
                    />
                  </div>
                </div>

                <div className="w-full sm:w-72 bg-muted/40 p-3.5 rounded-lg border space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span className="font-semibold">₹ {subtotal.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-rose-600">
                      <span>Discount:</span>
                      <span>- ₹ {discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t font-bold text-base text-teal-700">
                    <span>Net Amount:</span>
                    <span>₹ {netAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={resetForm} disabled={isSaving} className="w-full sm:w-auto">
                  Reset
                </Button>
                <Button
                  onClick={handleSaveBill}
                  disabled={isSaving}
                  className="bg-teal-600 hover:bg-teal-700 text-white w-full sm:min-w-[170px]"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving Bill...
                    </>
                  ) : (
                    <>
                      <Printer className="mr-2 h-4 w-4" />
                      Save &amp; Generate Bill
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Bill History */}
        <TabsContent value="history" className="space-y-4">
          <Card className="shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search past bills by patient name or receipt no..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  Showing {filteredHistory.length} bill(s)
                </span>
              </div>

              {/* Desktop Table View */}
              <div className="rounded-md border overflow-x-auto hidden md:block">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead>Receipt No</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Patient Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Tests Count</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No laboratory bills recorded yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredHistory.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-mono font-semibold text-teal-700">
                            {b.receiptNo}
                          </TableCell>
                          <TableCell className="text-xs">
                            {new Date(b.billDate).toLocaleDateString("en-GB")}
                          </TableCell>
                          <TableCell className="font-medium">
                            {b.patientName}
                            {b.patientCode !== "WALK-IN" && (
                              <span className="text-xs text-muted-foreground ml-1.5">
                                ({b.patientCode})
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                b.patientType === "IPD"
                                  ? "bg-teal-50 text-teal-700 border-teal-200"
                                  : b.patientType === "Walk-in"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-blue-50 text-blue-700 border-blue-200"
                              }
                            >
                              {b.patientType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {b.items?.length || 0} test(s)
                          </TableCell>
                          <TableCell className="text-right font-bold text-teal-700">
                            ₹ {b.netAmount.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPrintBill(b)}
                              className="h-8 gap-1 text-teal-600 hover:text-teal-700"
                            >
                              <Printer className="h-3.5 w-3.5" /> View / Print
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Grid View for Bill History */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:hidden">
                {filteredHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm col-span-full border rounded-lg bg-muted/20">
                    No laboratory bills recorded yet.
                  </div>
                ) : (
                  filteredHistory.map((b) => (
                    <div
                      key={b.id}
                      className="rounded-lg border bg-card p-3 shadow-sm hover:border-primary/40 transition-colors flex flex-col justify-between gap-2.5"
                    >
                      <div className="space-y-1.5">
                        {/* Top: Receipt No & Date */}
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="font-mono font-semibold text-teal-700">{b.receiptNo}</span>
                          <span>{new Date(b.billDate).toLocaleDateString("en-GB")}</span>
                        </div>

                        {/* Patient Name & Net Amount */}
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-semibold text-sm text-foreground">{b.patientName}</span>
                          <span className="font-bold text-sm text-teal-700 shrink-0">
                            ₹ {b.netAmount.toFixed(2)}
                          </span>
                        </div>

                        {/* Patient Code, Type badge, Procedures */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="font-mono text-[11px]">Code: {b.patientCode}</span>
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1.5 py-0 h-4 ${
                                b.patientType === "IPD"
                                  ? "bg-teal-50 text-teal-700 border-teal-200"
                                  : b.patientType === "Walk-in"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-blue-50 text-blue-700 border-blue-200"
                              }`}
                            >
                              {b.patientType}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {b.items?.length || 0} test(s)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end pt-2 border-t border-border/60">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPrintBill(b)}
                          className="h-7 text-xs px-2.5 gap-1.5 font-medium text-teal-700 hover:text-teal-800 hover:bg-teal-50 border-teal-200"
                        >
                          <Printer className="h-3 w-3" />
                          <span>View / Print</span>
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Print / View Dialog */}
      <Dialog open={!!printBill} onOpenChange={(v) => !v && setPrintBill(null)}>
        <DialogContent className="w-[96vw] sm:max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Laboratory Investigation Bill — {printBill?.receiptNo}</DialogTitle>
          </DialogHeader>

          {printBill && (
            <div className="space-y-4">
              <div className="border rounded-md p-4 bg-muted/20 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>Patient: <strong>{printBill.patientName}</strong></div>
                  <div>Type: <Badge variant="outline">{printBill.patientType}</Badge></div>
                  <div>Date: {new Date(printBill.billDate).toLocaleDateString("en-GB")}</div>
                  <div>Net Amount: <strong className="text-teal-700 text-sm">₹ {printBill.netAmount.toFixed(2)}</strong></div>
                </div>
              </div>

              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>Investigation / Test</TableHead>
                      <TableHead className="w-[80px] text-center">Qty</TableHead>
                      <TableHead className="w-[100px] text-right">Rate</TableHead>
                      <TableHead className="w-[110px] text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {printBill.items.map((it, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell className="font-medium">{it.description}</TableCell>
                        <TableCell className="text-center">{it.qty}</TableCell>
                        <TableCell className="text-right">₹ {it.charges.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-semibold">₹ {it.totalCharges.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setPrintBill(null)}>
                  Close
                </Button>
                <Button onClick={handlePrint} className="bg-teal-600 hover:bg-teal-700 text-white">
                  <Printer className="h-4 w-4 mr-2" /> Print Official Bill
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* New Test Catalog Modal */}
      <Dialog open={newTestOpen} onOpenChange={setNewTestOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Lab Test to Catalog</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-semibold">Test Name *</Label>
              <Input
                value={newTestName}
                onChange={(e) => setNewTestName(e.target.value)}
                placeholder="e.g. Complete Blood Count (CBC), Lipid Profile..."
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Default Charges (₹) *</Label>
              <Input
                type="number"
                min="0"
                value={newTestAmount}
                onChange={(e) => setNewTestAmount(e.target.value)}
                placeholder="e.g. 350"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewTestOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateNewTest}
              disabled={isCreatingTest}
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              {isCreatingTest ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...
                </>
              ) : (
                "Add to Catalog"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
