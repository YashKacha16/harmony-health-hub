import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Plus, Search, Pencil, Trash2, Printer, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RoleGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useDB } from "@/lib/useStore";
import { medicalService } from "@/services/medicalService";
import { opdService } from "@/services/opdService";
import { receptionService } from "@/services/receptionService";
import { settingsService } from "@/services/settingsService";
import type { Bill, BillItem, Medicine, Patient, Prescription } from "@/lib/store";

export const Route = createFileRoute("/medical")({
  head: () => ({ meta: [{ title: "Pharmacy — MediCore HMS" }, { name: "description", content: "Medicine stock and dispensing." }] }),
  component: () => (
    <RequireAuth module="Medical" action="Access">
      <AppShell><MedicalPage /></AppShell>
    </RequireAuth>
  ),
});

function MedicalPage() {
  useEffect(() => {
    medicalService.listMedicines();
    settingsService.listCategories();
    medicalService.listBills();
    receptionService.listPatients();
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Pharmacy</h2>
        <p className="text-sm text-muted-foreground">Manage stock and dispense against prescriptions.</p>
      </div>
      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="dispense">Dispense / Billing</TabsTrigger>
          <TabsTrigger value="bills">Search Bills</TabsTrigger>
        </TabsList>
        <TabsContent value="stock" className="mt-4"><StockTab /></TabsContent>
        <TabsContent value="dispense" className="mt-4"><DispenseTab /></TabsContent>
        <TabsContent value="bills" className="mt-4"><BillsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

interface MedDraft { id?: string; name: string; categoryId: string; mfgDate: string; expDate: string; quantity: string; mrp: string; batch: string; }

function StockTab() {
  const db = useDB();
  const [q, setQ] = useState("");
  const [catF, setCatF] = useState("all");
  const [open, setOpen] = useState(false);
  const emptyDraft = (): MedDraft => ({ name: "", categoryId: db.categories[0]?.id || "", mfgDate: "", expDate: "", quantity: "", mrp: "", batch: "" });
  const [draft, setDraft] = useState<MedDraft>(emptyDraft());

  const meds = useMemo(() => {
    return db.medicines.filter((m) => {
      const qm = !q || m.name.toLowerCase().includes(q.toLowerCase());
      const cm = catF === "all" || m.categoryId === catF;
      return qm && cm;
    });
  }, [db.medicines, q, catF]);

  const unitLabel = (id: string) => db.categories.find((c) => c.id === id)?.unit || "";
  const isLow = (m: Medicine) => m.quantity <= 10;
  const isNearExpiry = (m: Medicine) => {
    const days = (new Date(m.expDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return days > 0 && days < 90;
  };

  const save = async () => {
    if (!draft.name || !draft.categoryId) return toast.error("Fill required fields");
    const payload = {
      name: draft.name, categoryId: draft.categoryId, mfgDate: draft.mfgDate, expDate: draft.expDate,
      quantity: Number(draft.quantity) || 0, mrp: Number(draft.mrp) || 0, batch: draft.batch,
    };
    if (draft.id) { await medicalService.updateMedicine(draft.id, payload); toast.success("Updated"); }
    else { await medicalService.addMedicine(payload); toast.success("Added to stock"); }
    await medicalService.listMedicines();
    setOpen(false);
  };

  const openEdit = (m: Medicine) => {
    setDraft({ id: m.id, name: m.name, categoryId: m.categoryId, mfgDate: m.mfgDate, expDate: m.expDate, quantity: String(m.quantity), mrp: String(m.mrp), batch: m.batch });
    setOpen(true);
  };

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardContent className="p-5 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search medicines..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <Select value={catF} onValueChange={setCatF}>
            <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {db.categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => { setDraft(emptyDraft()); setOpen(true); }}><Plus className="h-4 w-4 mr-2" /> Add medicine</Button>
        </div>

        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>MFG</TableHead>
                <TableHead>EXP</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>MRP</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meds.length === 0 && <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No stock found</TableCell></TableRow>}
              {meds.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {m.name}
                      {isLow(m) && <Badge variant="destructive" className="text-xs">Low</Badge>}
                      {isNearExpiry(m) && <Badge className="bg-warning text-warning-foreground text-xs">Near expiry</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>{db.categories.find((c) => c.id === m.categoryId)?.name}</TableCell>
                  <TableCell className="font-mono text-xs">{m.batch}</TableCell>
                  <TableCell className="text-xs">{m.mfgDate}</TableCell>
                  <TableCell className="text-xs">{m.expDate}</TableCell>
                  <TableCell>{m.quantity} {unitLabel(m.categoryId)}</TableCell>
                  <TableCell>₹ {m.mrp}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(m)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={async () => { await medicalService.removeMedicine(m.id); toast.success("Removed"); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{draft.id ? "Edit" : "New"} medicine</DialogTitle></DialogHeader>
            <div className="grid sm:grid-cols-2 gap-4">
              <F label="Name *"><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></F>
              <F label="Category">
                <Select value={draft.categoryId} onValueChange={(v) => setDraft({ ...draft, categoryId: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{db.categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.unit})</SelectItem>)}</SelectContent>
                </Select>
              </F>
              <F label="Batch number"><Input value={draft.batch} onChange={(e) => setDraft({ ...draft, batch: e.target.value })} /></F>
              <F label={`Quantity (${unitLabel(draft.categoryId) || "unit"})`}><Input type="number" value={draft.quantity} onChange={(e) => setDraft({ ...draft, quantity: e.target.value })} /></F>
              <F label="MFG date"><Input type="date" max={new Date().toISOString().split('T')[0]} value={draft.mfgDate} onChange={(e) => setDraft({ ...draft, mfgDate: e.target.value })} /></F>
              <F label="EXP date"><Input type="date" min={new Date().toISOString().split('T')[0]} value={draft.expDate} onChange={(e) => setDraft({ ...draft, expDate: e.target.value })} /></F>
              <F label={`MRP (per ${unitLabel(draft.categoryId) || "unit"})`}><Input type="number" value={draft.mrp} onChange={(e) => setDraft({ ...draft, mrp: e.target.value })} /></F>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={save}>{draft.id ? "Save" : "Add"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

interface Line { medicineId: string; selected: boolean; units: string; }

function DispenseTab() {
  const db = useDB();
  const [code, setCode] = useState("");
  const [patient, setPatient] = useState<Patient | null>(null);
  const [rx, setRx] = useState<Prescription | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [discountType, setDiscountType] = useState<"flat" | "percent">("flat");
  const [discountValue, setDiscountValue] = useState("0");
  const [bill, setBill] = useState<Bill | null>(null);
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [walkInName, setWalkInName] = useState("");

  useEffect(() => {
    if (code.trim().length >= 2) {
      const timer = setTimeout(async () => {
        const res = await receptionService.searchPatient(code.trim());
        setSearchResults(res);
        setShowResults(true);
        setActiveIndex(-1);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setShowResults(false);
      setActiveIndex(-1);
    }
  }, [code]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showResults || searchResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % searchResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < searchResults.length) {
        const selectedPatient = searchResults[activeIndex];
        setCode(selectedPatient.name);
        setShowResults(false);
      }
    } else if (e.key === "Escape") {
      setShowResults(false);
    }
  };

  const search = async () => {
    const q = code.trim().toLowerCase();
    const patients = await receptionService.searchPatient(q);
    const p = patients.find(p => p.code.toLowerCase() === q || p.name.toLowerCase() === q) || patients[0];
    if (!p) { toast.error("Patient not found"); setPatient(null); setRx(null); return; }
    const r = await opdService.latestForPatient(p.id);
    setPatient(p);
    setRx(r);
    if (r) {
      setLines(r.medicines.map((m) => ({ medicineId: m.medicineId, selected: true, units: "1" })));
    } else {
      setLines([]);
      toast.warning("No prescription found for this patient");
    }
  };

  const medById = (id: string) => db.medicines.find((m) => m.id === id);
  const catById = (id: string) => db.categories.find((c) => c.id === id);
  const items: BillItem[] = lines
    .filter((l) => l.selected && l.medicineId && medById(l.medicineId))
    .map((l) => {
      const m = medById(l.medicineId)!;
      const cat = catById(m.categoryId);
      const units = Number(l.units) || 0;
      const pieces = units * (cat?.piecesPerUnit || 1);
      const total = units * m.mrp;
      return { medicineId: m.id, name: m.name, units, pieces, mrp: m.mrp, total };
    });
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const dv = Number(discountValue) || 0;
  const discountAmount = discountType === "flat" ? dv : (subtotal * dv) / 100;
  const total = Math.max(0, subtotal - discountAmount);

  const generateBill = async () => {
    let p = patient;
    if (isWalkIn) {
      if (!walkInName.trim()) {
        toast.error("Please enter a customer name.");
        return;
      }
      p = { id: "walk-in", code: "WALK-IN", name: walkInName.trim() } as Patient;
      setPatient(p);
    }

    if (!p || items.length === 0) return toast.error("Select at least one medicine");
    const b = await medicalService.createBill({
      patientId: p.id, patientCode: p.code, items,
      subtotal, discountType, discountValue: dv, total,
    });
    toast.success("Bill generated");
    setBill(b);
  };

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardContent className="p-5 space-y-5">
        <div className="flex flex-wrap gap-3 items-end relative">
          <div className="flex items-center space-x-2 mr-4 mb-2">
            <Switch id="walkin" checked={isWalkIn} onCheckedChange={(c: boolean) => {
              setIsWalkIn(c);
              if (c) {
                setPatient(null);
                setRx(null);
                setLines([{ medicineId: "", selected: true, units: "1" }]);
              } else {
                setLines([]);
                setCode("");
              }
            }} />
            <Label htmlFor="walkin">Walk-in Customer</Label>
          </div>

          {isWalkIn ? (
            <F label="Customer name">
              <Input 
                value={walkInName} 
                onChange={(e) => setWalkInName(e.target.value)} 
                placeholder="Enter customer name" 
                className="w-64"
              />
            </F>
          ) : (
            <div className="relative">
              <F label="Patient code / name">
                <Input 
                  value={code} 
                  onChange={(e) => setCode(e.target.value)} 
                  onFocus={() => setShowResults(true)}
                  onBlur={() => setTimeout(() => setShowResults(false), 200)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g. P-2026-00001 or Yash" 
                  className="w-64"
                />
              </F>
              {showResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-full bg-popover text-popover-foreground rounded-md border shadow-md z-10 overflow-hidden">
                  {searchResults.map((p, idx) => (
                    <div 
                      key={p.id} 
                      className={`px-3 py-2 text-sm hover:bg-muted cursor-pointer transition-colors ${
                        idx === activeIndex ? "bg-muted font-medium" : ""
                      }`}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setCode(p.name);
                        setShowResults(false);
                      }}
                    >
                      {p.name} <span className="text-muted-foreground text-xs">({p.code})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {!isWalkIn && <Button onClick={search}>Fetch prescription</Button>}
        </div>

        {patient && (
          <div className="grid sm:grid-cols-4 gap-3 rounded-lg bg-muted/40 p-4 text-sm">
            <Info k="Name" v={patient.name} />
            <Info k="Code" v={patient.code} />
            <Info k="Doctor" v={patient.doctor} />
            <Info k="Date" v={new Date(patient.registeredAt).toLocaleDateString()} />
          </div>
        )}

        {(patient || isWalkIn) && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Medicines</h3>
              {rx && rx.medicines.some((m) => !medById(m.medicineId)) && (
                <div className="flex items-center gap-1 text-xs text-warning"><AlertTriangle className="h-3 w-3" /> Some prescribed medicines not in stock</div>
              )}
            </div>
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Dispense</TableHead>
                    <TableHead className="w-1/3">Medicine</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Units</TableHead>
                    <TableHead>Pieces</TableHead>
                    <TableHead>MRP</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((l, i) => {
                    const m = medById(l.medicineId);
                    const cat = m ? catById(m.categoryId) : null;
                    const units = Number(l.units) || 0;
                    const pieces = units * (cat?.piecesPerUnit || 1);
                    const total = units * (m?.mrp || 0);
                    return (
                      <TableRow key={i}>
                        <TableCell>
                          <Checkbox checked={l.selected} onCheckedChange={(v) => {
                            const arr = [...lines]; arr[i] = { ...arr[i], selected: !!v }; setLines(arr);
                          }} />
                        </TableCell>
                        <TableCell>
                          <Select value={l.medicineId} onValueChange={(v) => {
                            const arr = [...lines]; arr[i] = { ...arr[i], medicineId: v }; setLines(arr);
                          }}>
                            <SelectTrigger className="w-full"><SelectValue placeholder="Select medicine..." /></SelectTrigger>
                            <SelectContent>
                              {db.medicines.map((med) => (
                                <SelectItem key={med.id} value={med.id}>{med.name} (Stock: {med.quantity})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>{cat?.name} ({cat?.unit})</TableCell>
                        <TableCell>
                          <Input type="number" step="0.5" className="w-24" value={l.units} onChange={(e) => {
                            const arr = [...lines]; arr[i] = { ...arr[i], units: e.target.value }; setLines(arr);
                          }} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">{pieces}</TableCell>
                        <TableCell>₹ {m?.mrp ?? "—"}</TableCell>
                        <TableCell className="font-medium">₹ {total.toFixed(2)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            
            <div className="flex justify-start">
              <Button variant="outline" size="sm" onClick={() => setLines([...lines, { medicineId: "", selected: true, units: "1" }])}>
                + Add medicine manually
              </Button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Discount</Label>
                <div className="flex gap-2">
                  <Select value={discountType} onValueChange={(v) => setDiscountType(v as "flat" | "percent")}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">Flat ₹</SelectItem>
                      <SelectItem value="percent">Percent %</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="number" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} />
                </div>
              </div>
              <div className="rounded-lg border p-4 space-y-2 text-sm bg-muted/30">
                <Row k="Subtotal" v={`₹ ${subtotal.toFixed(2)}`} />
                <Row k="Discount" v={`− ₹ ${discountAmount.toFixed(2)}`} />
                <div className="border-t pt-2 flex justify-between text-base font-semibold"><span>Total</span><span>₹ {total.toFixed(2)}</span></div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={generateBill}>Generate bill</Button>
            </div>
          </div>
        )}

        <Dialog open={!!bill} onOpenChange={(v) => !v && setBill(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Invoice</DialogTitle></DialogHeader>
            {bill && patient && <BillPrint bill={bill} patient={patient} hospitalSettings={db.hospitalSettings} />}
            <div className="flex justify-end gap-2 no-print">
              <Button variant="outline" onClick={() => setBill(null)}>Close</Button>
              <Button onClick={() => bill && patient && handlePrintBill(bill, patient, db.hospitalSettings)}><Printer className="h-4 w-4 mr-2" /> Print</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

const handlePrintBill = (bill: Bill, patient: Patient, settings: any) => {
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

  const itemsHtml = bill.items.map((i) => `
    <tr>
      <td style="padding: 10px; border: 1px solid #eee;">${i.name}</td>
      <td style="padding: 10px; border: 1px solid #eee; text-align: center;">${i.units}</td>
      <td style="padding: 10px; border: 1px solid #eee; text-align: center;">${i.pieces}</td>
      <td style="padding: 10px; border: 1px solid #eee; text-align: center;">₹ ${i.mrp}</td>
      <td style="padding: 10px; border: 1px solid #eee; text-align: right;">₹ ${i.total.toFixed(2)}</td>
    </tr>
  `).join("");

  printWindow.document.write(`
    <html>
      <head>
        <title>Invoice — ${patient.name}</title>
        <style>
          @page { margin: 0; }
          body { font-family: system-ui, -apple-system, sans-serif; padding: 0; margin: 0; color: #333; line-height: 1.5; }
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
              left: 50%;
              transform: translate(-50%, -50%);
              -webkit-transform: translate(-50%, -50%);
              opacity: 0.15;
              z-index: -1;
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
          .hospital-address-bar { text-align: center; font-size: 14px; font-weight: bold; color: #666; margin-bottom: 20px; text-transform: uppercase; }
          .letterhead { padding: 15px 0; text-align: left; font-size: 14px; color: #666; margin-bottom: 20px; }
          .section-title { font-size: 14px; font-weight: bold; text-transform: uppercase; color: #666; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-top: 25px; margin-bottom: 15px; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px; }
          .info-item { margin-bottom: 10px; }
          .info-label { font-size: 12px; color: #888; text-transform: uppercase; }
          .info-value { font-size: 15px; font-weight: 500; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background-color: #f8f9fa; font-weight: 600; text-align: left; }
          th, td { padding: 10px; border: 1px solid #eee; font-size: 14px; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .totals-table { width: 50%; margin-left: auto; margin-top: 20px; border: none; }
          .totals-table td { border: none; padding: 5px 10px; }
          .totals-table .grand-total { font-weight: bold; border-top: 1px solid #eee; font-size: 16px; padding-top: 10px; }
          .footer { margin-top: 40px; font-size: 14px; text-align: center; color: #666; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="watermark">
          ${settings.logoUrl ? `<img src="${settings.logoUrl}" alt="Watermark" />` : ''}
        </div>
        <div class="top-section">
          <div class="logo-container">
            ${settings.logoUrl ? `<img src="${settings.logoUrl}" alt="Hospital Logo" onerror="this.style.display='none'" />` : ''}
          </div>
          <div class="helpline-circle">
            <span class="helpline-title">Help Line :</span>
            <span class="helpline-number">${settings.helpline || 'N/A'}</span>
          </div>
        </div>
        
        <div class="page-padding">
          ${settings.address ? `<div class="hospital-address-bar">${settings.address}</div>` : ''}
          
          <div class="section-title">Patient Details</div>
        <div class="grid">
          <div class="info-item"><div class="info-label">Patient</div><div class="info-value">${patient.name} (${patient.code})</div></div>
          <div class="info-item"><div class="info-label">Date</div><div class="info-value">${new Date(bill.createdAt).toLocaleString()}</div></div>
        </div>

        <div class="section-title">Invoice Items</div>
        <table>
          <thead>
            <tr>
              <th>Medicine</th>
              <th class="text-center" style="width: 15%">Units</th>
              <th class="text-center" style="width: 15%">Pieces</th>
              <th class="text-center" style="width: 15%">MRP</th>
              <th class="text-right" style="width: 20%">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <table class="totals-table">
          <tr>
            <td>Subtotal:</td>
            <td class="text-right">₹ ${bill.subtotal.toFixed(2)}</td>
          </tr>
          <tr>
            <td>Discount (${bill.discountType === "flat" ? "₹" : "%"} ${bill.discountValue}):</td>
            <td class="text-right">− ₹ ${(bill.subtotal - bill.total).toFixed(2)}</td>
          </tr>
          <tr class="grand-total">
            <td>Total:</td>
            <td class="text-right">₹ ${bill.total.toFixed(2)}</td>
          </tr>
        </table>

        ${settings.address ? `
          <div class="footer">
            <div><strong>Address:</strong> ${settings.address}</div>
          </div>
        ` : ''}
        </div>

          <script>
            window.onload = function() {
              window.print();
            };
          </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

function BillPrint({ bill, patient, hospitalSettings }: { bill: Bill; patient: Patient; hospitalSettings: any }) {
  return (
    <div className="print-area space-y-4">
      <div className="border-2 border-dashed rounded-lg p-3 text-center text-xs text-muted-foreground">
        {hospitalSettings.logoUrl && <img src={hospitalSettings.logoUrl} alt="Logo" className="mx-auto max-h-12 mb-2" />}
        {hospitalSettings.address || "Hospital Letterhead — to be added"}
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Info k="Patient" v={`${patient.name} (${patient.code})`} />
        <Info k="Date" v={new Date(bill.createdAt).toLocaleString()} />
      </div>
      <table className="w-full text-sm border">
        <thead className="bg-muted/50"><tr><th className="text-left p-2">Medicine</th><th className="p-2">Units</th><th className="p-2">Pieces</th><th className="p-2">MRP</th><th className="p-2">Total</th></tr></thead>
        <tbody>
          {bill.items.map((i, idx) => (
            <tr key={idx} className="border-t">
              <td className="p-2">{i.name}</td>
              <td className="text-center p-2">{i.units}</td>
              <td className="text-center p-2">{i.pieces}</td>
              <td className="text-center p-2">₹ {i.mrp}</td>
              <td className="text-right p-2">₹ {i.total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="border-t pt-3 text-sm space-y-1">
        <Row k="Subtotal" v={`₹ ${bill.subtotal.toFixed(2)}`} />
        <Row k={`Discount (${bill.discountType === "flat" ? "₹" : "%"} ${bill.discountValue})`} v={`− ₹ ${(bill.subtotal - bill.total).toFixed(2)}`} />
        <div className="flex justify-between text-base font-semibold pt-1"><span>Total</span><span>₹ {bill.total.toFixed(2)}</span></div>
      </div>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>{children}</div>;
}
function Info({ k, v }: { k: string; v: string }) {
  return <div><div className="text-xs text-muted-foreground">{k}</div><div className="font-medium">{v}</div></div>;
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{k}</span><span>{v}</span></div>;
}

function BillsTab() {
  const db = useDB();
  const [q, setQ] = useState("");
  const [activeBill, setActiveBill] = useState<Bill | null>(null);

  useEffect(() => {
    medicalService.listBills();
  }, []);

  const filteredBills = useMemo(() => {
    return db.bills.filter(b => {
      const p = db.patients.find(x => x.id === b.patientId || x.code === b.patientCode);
      const nameMatch = p?.name.toLowerCase().includes(q.toLowerCase());
      const codeMatch = b.patientCode.toLowerCase().includes(q.toLowerCase());
      return !q || nameMatch || codeMatch;
    });
  }, [db.bills, db.patients, q]);

  const getPatientName = (b: Bill) => {
    const p = db.patients.find(x => x.id === b.patientId || x.code === b.patientCode);
    return p ? p.name : "Unknown Patient";
  };

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardContent className="p-5 space-y-5">
        <div className="flex max-w-sm relative">
          <Input 
            value={q} 
            onChange={(e) => setQ(e.target.value)} 
            placeholder="Search by patient code or name..." 
            className="pr-10"
          />
          <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>

        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bill ID</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Patient Code</TableHead>
                <TableHead>Subtotal</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBills.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No bills found
                  </TableCell>
                </TableRow>
              ) : (
                filteredBills.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell className="font-medium"># {b.id}</TableCell>
                    <TableCell>{getPatientName(b)}</TableCell>
                    <TableCell>{b.patientCode}</TableCell>
                    <TableCell>₹ {b.subtotal.toFixed(2)}</TableCell>
                    <TableCell className="font-semibold">₹ {b.total.toFixed(2)}</TableCell>
                    <TableCell>{new Date(b.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setActiveBill(b)}>
                        <Printer className="h-4 w-4 mr-1" /> View / Print
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={!!activeBill} onOpenChange={(v) => !v && setActiveBill(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Invoice</DialogTitle></DialogHeader>
            {activeBill && (
              <BillPrint 
                bill={activeBill} 
                patient={
                  db.patients.find(x => x.id === activeBill.patientId || x.code === activeBill.patientCode) || 
                  { id: activeBill.patientId, code: activeBill.patientCode, name: "Unknown Patient" } as any
                } 
                hospitalSettings={db.hospitalSettings}
              />
            )}
            <div className="flex justify-end gap-2 no-print">
              <Button variant="outline" onClick={() => setActiveBill(null)}>Close</Button>
              <Button onClick={() => {
                if (activeBill) {
                  const patient = db.patients.find(x => x.id === activeBill.patientId || x.code === activeBill.patientCode) || 
                    { id: activeBill.patientId, code: activeBill.patientCode, name: "Unknown Patient" } as any;
                  handlePrintBill(activeBill, patient, db.hospitalSettings);
                }
              }}><Printer className="h-4 w-4 mr-2" /> Print</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
