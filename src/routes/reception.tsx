import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Printer, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { RequireAuth } from "@/components/RoleGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDB } from "@/lib/useStore";
import { receptionService } from "@/services/receptionService";
import { settingsService } from "@/services/settingsService";
import type { PastOperation, Patient } from "@/lib/store";

export const Route = createFileRoute("/reception")({
  head: () => ({ meta: [{ title: "Reception — MediCore HMS" }, { name: "description", content: "Patient registration and receipt generation." }] }),
  component: () => (
    <RequireAuth roles={["Admin", "Receptionist", "Doctor"]}>
      <AppShell><ReceptionPage /></AppShell>
    </RequireAuth>
  ),
});

interface Draft {
  name: string; phone: string; age: string; gender: "Male" | "Female" | "Other";
  weight: string; height: string; caste: string;
  addressLine: string; state: string; city: string; pincode: string;
  type: "OPD" | "IPD";
  department: string; doctor: string; opdCharge: string;
  hasAllergy: boolean; allergy: string; 
  hasDeformity: boolean; deformity: string; complaint: string;
  mediclaim: boolean; insuranceCompany: string; policyNumber: string;
  hasPastOps: boolean; pastOperations: PastOperation[];
}

function ReceptionPage() {
  const db = useDB();
  const opdCharge = db.charges.find((c) => c.name === "OPD Charge")?.amount ?? 0;

  useEffect(() => {
    settingsService.listCharges();
    settingsService.listDepartments();
    receptionService.listPatients();
  }, []);

  const initial: Draft = {
    name: "", phone: "", age: "", gender: "Male",
    weight: "", height: "", caste: "",
    addressLine: "", state: "", city: "", pincode: "",
    type: "OPD",
    department: db.departments[0]?.name || "", doctor: "", opdCharge: String(opdCharge),
    hasAllergy: false, allergy: "", 
    hasDeformity: false, deformity: "", complaint: "",
    mediclaim: false, insuranceCompany: "", policyNumber: "",
    hasPastOps: false, pastOperations: [],
  };

  const [d, setD] = useState<Draft>(initial);
  const [receipt, setReceipt] = useState<Patient | null>(null);

  const doctors = useMemo(
    () => db.employees.filter((e) => e.role === "Doctor" && e.department === d.department && e.active),
    [db.employees, d.department],
  );

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((prev) => ({ ...prev, [k]: v }));

  const submit = async () => {
    if (!d.name || !d.phone || !d.age) return toast.error("Fill required patient fields");
    if (d.phone.length !== 10) return toast.error("Phone number must be exactly 10 digits");
    if (!d.department || !d.doctor) return toast.error("Select department and doctor");
    const patient = await receptionService.registerPatient({
      name: d.name, phone: d.phone, age: Number(d.age), gender: d.gender,
      weight: d.weight ? Number(d.weight) : undefined,
      height: d.height ? Number(d.height) : undefined,
      caste: d.caste || undefined,
      addressLine: d.addressLine, state: d.state, city: d.city, pincode: d.pincode,
      type: d.type,
      department: d.department, doctor: d.doctor,
      opdCharge: Number(d.opdCharge) || 0,
      allergy: d.hasAllergy ? d.allergy : undefined,
      deformity: d.hasDeformity ? d.deformity : undefined,
      complaint: d.complaint || undefined,
      mediclaim: d.mediclaim,
      insuranceCompany: d.mediclaim ? d.insuranceCompany : undefined,
      policyNumber: d.mediclaim ? d.policyNumber : undefined,
      pastOperations: d.hasPastOps ? d.pastOperations : undefined,
    });
    setReceipt(patient);
    toast.success(`Registered — ${patient.code}`);
    setD({ ...initial, department: d.department });
  };

  const addOp = () => set("pastOperations", [...d.pastOperations, { type: "", bodyPart: "", place: "", deformity: "" }]);
  const updOp = (i: number, k: keyof PastOperation, v: string) => {
    const arr = [...d.pastOperations];
    arr[i] = { ...arr[i], [k]: v };
    set("pastOperations", arr);
  };
  const rmOp = (i: number) => set("pastOperations", d.pastOperations.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Patient Registration</h2>
          <p className="text-sm text-muted-foreground">Register new patients and generate their receipt.</p>
        </div>
      </div>

      <Tabs value={d.type} onValueChange={(v) => set("type", v as "OPD" | "IPD")}>
        <TabsList className="mb-4">
          <TabsTrigger value="OPD">OPD Registration</TabsTrigger>
          <TabsTrigger value="IPD">IPD Registration</TabsTrigger>
        </TabsList>

        <Card>
          <CardContent className="p-6 space-y-8">
            <Section title="Personal details">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Patient name *"><Input value={d.name} onChange={(e) => set("name", e.target.value)} /></Field>
              <Field label="Phone *"><Input value={d.phone} maxLength={10} onChange={(e) => set("phone", e.target.value.replace(/\D/g, ''))} /></Field>
              <Field label="Age *"><Input type="number" value={d.age} onChange={(e) => set("age", e.target.value)} /></Field>
              <Field label="Gender">
                <Select value={d.gender} onValueChange={(v) => set("gender", v as Draft["gender"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Weight (kg)"><Input type="number" value={d.weight} onChange={(e) => set("weight", e.target.value)} /></Field>
              <Field label="Height (cm)"><Input type="number" value={d.height} onChange={(e) => set("height", e.target.value)} /></Field>
              <Field label="Caste">
                <Select value={d.caste} onValueChange={(v) => set("caste", v)}>
                  <SelectTrigger><SelectValue placeholder="Select caste" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="OBC">OBC</SelectItem>
                    <SelectItem value="SC">SC</SelectItem>
                    <SelectItem value="ST">ST</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          <Section title="Address">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field label="Address line" className="lg:col-span-2"><Input value={d.addressLine} onChange={(e) => set("addressLine", e.target.value)} /></Field>
              <Field label="City"><Input value={d.city} onChange={(e) => set("city", e.target.value)} /></Field>
              <Field label="State"><Input value={d.state} onChange={(e) => set("state", e.target.value)} /></Field>
            </div>
          </Section>

          {d.type === "OPD" && (
            <Section title="OPD details">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Department">
                <Select value={d.department} onValueChange={(v) => { set("department", v); set("doctor", ""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{db.departments.map((x) => <SelectItem key={x.id} value={x.name}>{x.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Doctor">
                <Select value={d.doctor} onValueChange={(v) => set("doctor", v)}>
                  <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                  <SelectContent>
                    {doctors.length === 0
                      ? <SelectItem value="__none" disabled>No doctors in this department</SelectItem>
                      : doctors.map((doc) => <SelectItem key={doc.id} value={doc.name}>{doc.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="OPD Charge">
                <Select value={d.opdCharge} onValueChange={(v) => set("opdCharge", v)}>
                  <SelectTrigger><SelectValue placeholder="Select charge" /></SelectTrigger>
                  <SelectContent>
                    {db.charges.map((c) => (
                      <SelectItem key={c.id} value={c.amount.toString()}>
                        {c.name} (₹{c.amount})
                      </SelectItem>
                    ))}
                    {db.charges.length === 0 && <SelectItem value="0" disabled>No charges available</SelectItem>}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>
          )}

          {d.type === "IPD" && (
            <Section title="IPD details">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Department">
                  <Select value={d.department} onValueChange={(v) => { set("department", v); set("doctor", ""); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{db.departments.map((x) => <SelectItem key={x.id} value={x.name}>{x.name}</SelectItem>)}</SelectContent>
                  </Select>
                </Field>
                <Field label="Doctor">
                  <Select value={d.doctor} onValueChange={(v) => set("doctor", v)}>
                    <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                    <SelectContent>
                      {doctors.length === 0
                        ? <SelectItem value="__none" disabled>No doctors in this department</SelectItem>
                        : doctors.map((doc) => <SelectItem key={doc.id} value={doc.name}>{doc.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </Section>
          )}

          <Section title="Medical history">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox id="hasAllergy" checked={d.hasAllergy} onCheckedChange={(v) => { set("hasAllergy", !!v); if (!v) set("allergy", ""); }} />
                    <Label htmlFor="hasAllergy">Any type of allergy</Label>
                  </div>
                  {d.hasAllergy && <Field label="Please specify allergy"><Input value={d.allergy} onChange={(e) => set("allergy", e.target.value)} /></Field>}
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox id="hasDeformity" checked={d.hasDeformity} onCheckedChange={(v) => { set("hasDeformity", !!v); if (!v) set("deformity", ""); }} />
                    <Label htmlFor="hasDeformity">Any type of deformity</Label>
                  </div>
                  {d.hasDeformity && <Field label="Please specify deformity"><Input value={d.deformity} onChange={(e) => set("deformity", e.target.value)} /></Field>}
                </div>

                <Field label="Complaint" className="sm:col-span-2"><Textarea rows={3} value={d.complaint} onChange={(e) => set("complaint", e.target.value)} /></Field>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Checkbox id="mediclaim" checked={d.mediclaim} onCheckedChange={(v) => set("mediclaim", !!v)} />
                <Label htmlFor="mediclaim">Mediclaim / Insurance</Label>
              </div>
              {d.mediclaim && (
                <div className="grid sm:grid-cols-2 gap-4 mt-3">
                  <Field label="Insurance company"><Input value={d.insuranceCompany} onChange={(e) => set("insuranceCompany", e.target.value)} /></Field>
                  <Field label="Policy number"><Input value={d.policyNumber} onChange={(e) => set("policyNumber", e.target.value)} /></Field>
                </div>
              )}

              <div className="mt-4 flex items-center gap-2">
                <Checkbox id="pastops" checked={d.hasPastOps} onCheckedChange={(v) => { set("hasPastOps", !!v); if (v && d.pastOperations.length === 0) addOp(); }} />
                <Label htmlFor="pastops">Any type of operation in past</Label>
              </div>
              {d.hasPastOps && (
                <div className="mt-3 space-y-3">
                  {d.pastOperations.map((op, i) => (
                    <div key={i} className="grid sm:grid-cols-4 gap-3 items-end rounded-lg border p-3 bg-muted/30">
                      <Field label="Operation type"><Input value={op.type} onChange={(e) => updOp(i, "type", e.target.value)} /></Field>
                      <Field label="Body part"><Input value={op.bodyPart} onChange={(e) => updOp(i, "bodyPart", e.target.value)} /></Field>
                      <Field label="Place / hospital"><Input value={op.place} onChange={(e) => updOp(i, "place", e.target.value)} /></Field>
                      <div className="flex gap-2">
                        <Field label="Deformity" className="flex-1"><Input value={op.deformity} onChange={(e) => updOp(i, "deformity", e.target.value)} /></Field>
                        <Button variant="ghost" size="icon" onClick={() => rmOp(i)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addOp}><Plus className="h-4 w-4 mr-1" /> Add operation</Button>
                </div>
              )}
            </Section>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setD(initial)}>Reset</Button>
            <Button onClick={submit}>Register patient</Button>
          </div>
        </CardContent>
      </Card>
      </Tabs>

      <Dialog open={!!receipt} onOpenChange={(v) => !v && setReceipt(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Registration receipt</DialogTitle></DialogHeader>
          {receipt && <Receipt patient={receipt} />}
          <div className="flex justify-end gap-2 no-print">
            <Button variant="outline" onClick={() => setReceipt(null)}>Close</Button>
            <Button onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" /> Print receipt</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">{title}</h3>
      {children}
    </div>
  );
}
function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={`space-y-1.5 ${className}`}><Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>{children}</div>;
}

function Receipt({ patient }: { patient: Patient }) {
  return (
    <div className="print-area space-y-4">
      <div className="border-2 border-dashed rounded-lg p-3 text-center text-xs text-muted-foreground">
        Hospital Letterhead — to be added
      </div>
      <div className="text-center">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Patient Code</div>
        <div className="text-3xl font-bold tracking-tight">{patient.code}</div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Line k="Name" v={patient.name} />
        <Line k="Age / Gender" v={`${patient.age} / ${patient.gender}`} />
        <Line k="Department" v={patient.department} />
        <Line k="Doctor" v={patient.doctor} />
        <Line k="Visit type" v={patient.type} />
        <Line k="Date" v={new Date(patient.registeredAt).toLocaleString()} />
      </div>
      <div className="flex items-center justify-between border-t pt-3">
        <div className="text-sm text-muted-foreground">OPD Charge</div>
        <div className="text-lg font-semibold">₹ {patient.opdCharge.toFixed(2)}</div>
      </div>
    </div>
  );
}
function Line({ k, v }: { k: string; v: string }) {
  return <div><div className="text-xs text-muted-foreground">{k}</div><div className="font-medium">{v}</div></div>;
}
