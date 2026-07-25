import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { useDB } from "@/lib/useStore";
import { medicalService } from "@/services/medicalService";
import { opdService } from "@/services/opdService";
import { receptionService } from "@/services/receptionService";
import type { Bill, BillItem, Medicine, Patient, Prescription } from "@/lib/store";

export const Route = createFileRoute("/medical")({
  head: () => ({ meta: [{ title: "Pharmacy — MediCore HMS" }, { name: "description", content: "Medicine stock and dispensing." }] }),
  component: () => (
    <RequireAuth roles={["Admin", "Pharmacist"]}>
      <AppShell><MedicalPage /></AppShell>
    </RequireAuth>
  ),
});

function MedicalPage() {
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
        </TabsList>
        <TabsContent value="stock" className="mt-4"><StockTab /></TabsContent>
        <TabsContent value="dispense" className="mt-4"><DispenseTab /></TabsContent>
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
              <F label="MFG date"><Input type="date" value={draft.mfgDate} onChange={(e) => setDraft({ ...draft, mfgDate: e.target.value })} /></F>
              <F label="EXP date"><Input type="date" value={draft.expDate} onChange={(e) => setDraft({ ...draft, expDate: e.target.value })} /></F>
              <F label="MRP (per unit)"><Input type="number" value={draft.mrp} onChange={(e) => setDraft({ ...draft, mrp: e.target.value })} /></F>
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

  const search = async () => {
    const p = await receptionService.findByCode(code.trim());
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
  const items: BillItem[] = lines.filter((l) => l.selected && l.medicineId).map((l) => {
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
    if (!patient || items.length === 0) return toast.error("Select at least one medicine");
    const b = await medicalService.createBill({
      patientId: patient.id, patientCode: patient.code, items,
      subtotal, discountType, discountValue: dv, total,
    });
    toast.success("Bill generated");
    setBill(b);
  };

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardContent className="p-5 space-y-5">
        <div className="flex flex-wrap gap-3 items-end">
          <F label="Patient code"><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. P-2026-00001" /></F>
          <Button onClick={search}>Fetch prescription</Button>
        </div>

        {patient && (
          <div className="grid sm:grid-cols-4 gap-3 rounded-lg bg-muted/40 p-4 text-sm">
            <Info k="Name" v={patient.name} />
            <Info k="Code" v={patient.code} />
            <Info k="Doctor" v={patient.doctor} />
            <Info k="Date" v={new Date(patient.registeredAt).toLocaleDateString()} />
          </div>
        )}

        {rx && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Prescribed medicines</h3>
              {rx.medicines.some((m) => !medById(m.medicineId)) && (
                <div className="flex items-center gap-1 text-xs text-warning"><AlertTriangle className="h-3 w-3" /> Some medicines not in stock</div>
              )}
            </div>
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Dispense</TableHead>
                    <TableHead>Medicine</TableHead>
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
                        <TableCell className="font-medium">{m?.name || "(Not in stock)"}</TableCell>
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
            {bill && patient && <BillPrint bill={bill} patient={patient} />}
            <div className="flex justify-end gap-2 no-print">
              <Button variant="outline" onClick={() => setBill(null)}>Close</Button>
              <Button onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" /> Print</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function BillPrint({ bill, patient }: { bill: Bill; patient: Patient }) {
  return (
    <div className="print-area space-y-4">
      <div className="border-2 border-dashed rounded-lg p-3 text-center text-xs text-muted-foreground">
        Hospital Letterhead — to be added
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
