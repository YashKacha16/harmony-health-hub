import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Plus, Trash2, Printer, Stethoscope } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDB } from "@/lib/useStore";
import { opdService } from "@/services/opdService";
import type { Patient, PrescribedMedicine, Prescription } from "@/lib/store";

export const Route = createFileRoute("/opd")({
  head: () => ({ meta: [{ title: "OPD — MediCore HMS" }, { name: "description", content: "OPD queue and prescriptions." }] }),
  component: () => (
    <RequireAuth roles={["Admin", "Doctor", "Nurse"]}>
      <AppShell><OPDPage /></AppShell>
    </RequireAuth>
  ),
});

const emptyRow = (): PrescribedMedicine => ({ medicineId: "", name: "", morning: false, afternoon: false, evening: false, night: false });

function OPDPage() {
  const db = useDB();
  const [q, setQ] = useState("");
  const [active, setActive] = useState<Patient | null>(null);
  const [diagnosis, setDiagnosis] = useState("");
  const [disease, setDisease] = useState("");
  const [rows, setRows] = useState<PrescribedMedicine[]>([]);
  const [suggestion, setSuggestion] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [course, setCourse] = useState("");
  const [printData, setPrintData] = useState<{ p: Patient; rx: Prescription } | null>(null);

  const opdPatients = useMemo(() => {
    return db.patients
      .filter((p) => !q || p.code.toLowerCase().includes(q.toLowerCase()) || p.name.toLowerCase().includes(q.toLowerCase()))
      .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));
  }, [db.patients, q]);

  const openPrescribe = (p: Patient) => {
    setActive(p);
    setDiagnosis(""); setDisease(""); setSuggestion(""); setFollowUp(""); setCourse("");
    setRows(Array.from({ length: 5 }, emptyRow));
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
    const meds = rows.filter((r) => r.medicineId);
    if (meds.length === 0) return toast.error("Add at least one medicine");
    const rx = await opdService.create({
      patientId: active.id,
      diagnosis, disease,
      medicines: meds,
      suggestion,
      followUpDate: followUp || undefined,
      courseDays: course ? Number(course) : undefined,
    });
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

          <div className="rounded-lg border overflow-x-auto">
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
                {opdPatients.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No patients yet — register from Reception.</TableCell></TableRow>
                )}
                {opdPatients.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.code}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.age} / {p.gender}</TableCell>
                    <TableCell>{p.department}</TableCell>
                    <TableCell>{p.doctor}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{new Date(p.registeredAt).toLocaleDateString()}</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" onClick={() => openPrescribe(p)}>
                        <Stethoscope className="h-4 w-4 mr-1" /> Prescribe
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!active} onOpenChange={(v) => !v && setActive(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                      {rows.map((r, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Select value={r.medicineId} onValueChange={(v) => {
                              const m = db.medicines.find((x) => x.id === v);
                              updRow(i, { medicineId: v, name: m?.name || "" });
                            }}>
                              <SelectTrigger><SelectValue placeholder="Select medicine" /></SelectTrigger>
                              <SelectContent>
                                {db.medicines.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          {(["morning", "afternoon", "evening", "night"] as const).map((slot) => (
                            <TableCell key={slot} className="text-center">
                              <Checkbox checked={r[slot]} onCheckedChange={(v) => updRow(i, { [slot]: !!v })} />
                            </TableCell>
                          ))}
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={() => rmRow(i)}><Trash2 className="h-4 w-4" /></Button>
                          </TableCell>
                        </TableRow>
                      ))}
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Prescription</DialogTitle></DialogHeader>
          {printData && <PrescriptionPrint p={printData.p} rx={printData.rx} />}
          <div className="flex justify-end gap-2 no-print">
            <Button variant="outline" onClick={() => setPrintData(null)}>Close</Button>
            <Button onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" /> Print</Button>
          </div>
        </DialogContent>
      </Dialog>
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

function PrescriptionPrint({ p, rx }: { p: Patient; rx: Prescription }) {
  return (
    <div className="print-area space-y-4">
      <div className="border-2 border-dashed rounded-lg p-3 text-center text-xs text-muted-foreground">
        Hospital Letterhead — to be added
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
            {rx.medicines.map((m, i) => (
              <tr key={i} className="border-t">
                <td className="p-2">{m.name}</td>
                <td className="text-center p-2">{m.morning ? "✓" : ""}</td>
                <td className="text-center p-2">{m.afternoon ? "✓" : ""}</td>
                <td className="text-center p-2">{m.evening ? "✓" : ""}</td>
                <td className="text-center p-2">{m.night ? "✓" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rx.suggestion && <div><h4 className="text-sm font-semibold">Suggestions</h4><p className="text-sm text-muted-foreground whitespace-pre-wrap">{rx.suggestion}</p></div>}
      {rx.courseDays && <div className="text-sm">Course duration: <b>{rx.courseDays} days</b></div>}
    </div>
  );
}
