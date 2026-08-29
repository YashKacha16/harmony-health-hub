import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { Printer, Plus, Trash2, FileCheck, CheckCircle2 } from "lucide-react";
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
    <RequireAuth module="Reception" action="Access">
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
  ward?: string;
  wardNumber?: string;
  relativeName?: string;
  relation?: string;
  relativePhone?: string;
  relativeAddress?: string;
  maritalStatus?: string;
  child?: string;
  occupation?: string;
  religion?: string;
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
    ward: "", wardNumber: "",
    relativeName: "", relation: "", relativePhone: "", relativeAddress: "",
    maritalStatus: "", child: "", occupation: "", religion: "",
  };

  const [d, setD] = useState<Draft>(initial);
  const [receipt, setReceipt] = useState<Patient | null>(null);
  const [consentPatient, setConsentPatient] = useState<Patient | null>(null);

  const doctors = useMemo(
    () => db.employees.filter((e) => e.department === d.department && e.active),
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
      ward: d.type === "IPD" ? d.ward : undefined,
      wardNumber: d.type === "IPD" ? d.wardNumber : undefined,
      relativeName: d.type === "IPD" ? d.relativeName : undefined,
      relation: d.type === "IPD" ? d.relation : undefined,
      relativePhone: d.type === "IPD" ? d.relativePhone : undefined,
      relativeAddress: d.type === "IPD" ? d.relativeAddress : undefined,
      maritalStatus: d.type === "IPD" ? d.maritalStatus : undefined,
      child: d.type === "IPD" ? d.child : undefined,
      occupation: d.type === "IPD" ? d.occupation : undefined,
      religion: d.type === "IPD" ? d.religion : undefined,
    });
    if (d.type === "IPD") {
      setConsentPatient(patient);
      toast.success(`IPD patient created — please complete consent form`);
    } else {
      setReceipt(patient);
      toast.success(`Registered — ${patient.code}`);
    }
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
              {d.type === "IPD" && (
                <>
                  <Field label="Marital Status">
                    <Select value={d.maritalStatus} onValueChange={(v) => set("maritalStatus", v)}>
                      <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Single">Single</SelectItem>
                        <SelectItem value="Married">Married</SelectItem>
                        <SelectItem value="Divorced">Divorced</SelectItem>
                        <SelectItem value="Widowed">Widowed</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Child"><Input value={d.child} onChange={(e) => set("child", e.target.value)} placeholder="No. of children" /></Field>
                  <Field label="Occupation"><Input value={d.occupation} onChange={(e) => set("occupation", e.target.value)} /></Field>
                  <Field label="Religion"><Input value={d.religion} onChange={(e) => set("religion", e.target.value)} /></Field>
                </>
              )}
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
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                <Field label="Ward">
                  <Select value={d.ward} onValueChange={(v) => set("ward", v)}>
                    <SelectTrigger><SelectValue placeholder="Select ward" /></SelectTrigger>
                    <SelectContent>
                      {db.ipdWards?.map((w) => (
                        <SelectItem key={w.id} value={w.name}>{w.name}</SelectItem>
                      ))}
                      {(!db.ipdWards || db.ipdWards.length === 0) && <SelectItem value="__none" disabled>No wards configured</SelectItem>}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Ward Number">
                  <Input value={d.wardNumber} onChange={(e) => set("wardNumber", e.target.value)} placeholder="e.g. W-12" />
                </Field>
              </div>
            </Section>
          )}

          {d.type === "IPD" && (
            <Section title="Relative details">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Relative Name"><Input value={d.relativeName} onChange={(e) => set("relativeName", e.target.value)} /></Field>
                <Field label="Relation"><Input value={d.relation} onChange={(e) => set("relation", e.target.value)} /></Field>
                <Field label="Mobile No. of Relative"><Input value={d.relativePhone} maxLength={10} onChange={(e) => set("relativePhone", e.target.value.replace(/\D/g, ''))} /></Field>
                <Field label="Relative Address" className="lg:col-span-3"><Input value={d.relativeAddress} onChange={(e) => set("relativeAddress", e.target.value)} /></Field>
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
            <Button onClick={() => receipt && handlePrintReceipt(receipt, db.hospitalSettings)}><Printer className="h-4 w-4 mr-2" /> Print receipt</Button>
          </div>
        </DialogContent>
      </Dialog>

      {consentPatient && (
        <ConsentFormDialog
          patient={consentPatient}
          settings={db.hospitalSettings}
          onClose={() => {
            setConsentPatient(null);
          }}
        />
      )}
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

const handlePrintReceipt = (patient: Patient, settings: any) => {
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
  const content = `
    <html>
      <head>
        <title>Receipt - ${patient.code}</title>
        <style>
          @page { margin: 0; }
          body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; margin: 0; color: #333; line-height: 1.5; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .header-img { width: 100%; max-height: 130px; object-fit: contain; margin-bottom: 10px; }
          .hospital-address-bar { text-align: center; font-size: 14px; font-weight: 700; color: #444; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.5px; }
          
          .divider { border: 0; border-bottom: 2px solid #333; margin: 15px 0; }
          
          .patient-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 15px; font-size: 13px; }
          .info-group { margin-bottom: 10px; }
          .info-label { color: #666; margin-bottom: 2px; }
          .info-value { font-weight: bold; font-size: 14px; color: #000; }
          
          .section-title { font-size: 16px; font-weight: bold; text-transform: uppercase; color: #d32f2f; margin-top: 20px; margin-bottom: 15px; font-style: italic; }
          
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
          th { font-weight: bold; text-align: left; padding: 8px 4px; border-bottom: 1px solid #ccc; color: #000; }
          td { padding: 8px 4px; border-bottom: 1px solid #eee; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          
          .totals-table { width: 40%; margin-left: auto; margin-top: 20px; border: none; }
          .totals-table td { padding: 6px 4px; border: none; text-align: right; }
          .totals-table .grand-total { font-weight: bold; font-size: 16px; color: #000; }
          
          .footer-helpline { text-align: center; color: #d32f2f; font-weight: bold; margin-top: 50px; font-size: 18px; text-transform: uppercase; }
        </style>
      </head>
      <body>
        <img src="${settings?.logoUrl && settings.logoUrl !== '/logo.png' ? settings.logoUrl : '/logo.jpg'}" class="header-img" alt="Logo" onerror="this.src='/lifecare-logo.jpg'" />
        ${settings?.address ? `<div class="hospital-address-bar">${settings.address}</div>` : ''}
        
        <div class="patient-grid">
          <div>
            <div class="info-group">
              <div class="info-label">Patient Code</div>
              <div class="info-value">${patient.code}</div>
            </div>
            <div class="info-group">
              <div class="info-label">Patient Name</div>
              <div class="info-value">${patient.name}</div>
            </div>
          </div>
          <div>
            <div class="info-group">
              <div class="info-label">Age / Gender</div>
              <div class="info-value">${patient.age} / ${patient.gender}</div>
            </div>
            <div class="info-group">
              <div class="info-label">Department</div>
              <div class="info-value">${patient.department}</div>
            </div>
          </div>
          <div>
            <div class="info-group">
              <div class="info-label">Date</div>
              <div class="info-value">${new Date(patient.registeredAt).toLocaleDateString()}</div>
            </div>
            <div class="info-group">
              <div class="info-label">Doctor</div>
              <div class="info-value">${patient.doctor || "-"}</div>
            </div>
          </div>
        </div>
        
        <hr class="divider" />
        <div class="section-title">Registration Receipt</div>
        
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>OPD Consultation Charge (${patient.type})</td>
              <td class="text-right">₹ ${patient.opdCharge.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
        
        ${settings?.helpline ? `<div class="footer-helpline">HELP LINE :- ${settings.helpline}</div>` : ''}
        
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;
  printWindow.document.write(content);
  printWindow.document.close();
};

function ConsentFormDialog({ patient, settings, onClose }: { patient: Patient, settings: any, onClose: () => void }) {
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const toggle = (i: number) => setChecked(p => ({ ...p, [i]: !p[i] }));
  const allChecked = Object.keys(checked).length === 7 && Object.values(checked).every(Boolean);

  const printConsent = () => {
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
    const content = `
      <html>
        <head>
          <title>Consent Form - ${patient.code}</title>
          <style>
            @page { margin: 0; size: A4; }
            body { font-family: Arial, sans-serif; padding: 0; margin: 0; color: #000; line-height: 1.5; font-size: 13px; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            
            .page-padding { padding: 0 40px 40px 40px; }
            
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
              top: 30%;
              left: 10%;
              width: 80%;
              height: 40%;
              background-image: url('${settings.logoUrl && settings.logoUrl !== '/logo.png' ? settings.logoUrl : '/lifecare-logo.jpg'}');
              background-size: contain;
              background-position: center;
              background-repeat: no-repeat;
              opacity: 0.1;
              transform: rotate(-30deg);
              z-index: -1;
              pointer-events: none;
            }

            .title { text-align: center; font-size: 16px; font-weight: bold; color: #e53e3e; text-decoration: underline; margin-bottom: 30px; text-transform: uppercase; }
            
            .date-row { text-align: right; margin-bottom: 10px; font-weight: bold; font-size: 12px; color: #1e3a8a; }
            .date-row span { color: #000; font-weight: normal; }
            
            .info-row { margin-bottom: 15px; font-size: 12px; color: #1e3a8a; font-weight: bold; display: flex; align-items: baseline; flex-wrap: wrap; }
            .info-row span { color: #000; font-weight: normal; flex: 1; border-bottom: 1px dotted #666; margin-left: 5px; margin-right: 15px; min-width: 50px; }
            
            .blue-text { color: #1e3a8a; font-weight: bold; }
            
            .member-note { text-align: justify; margin-top: 20px; margin-bottom: 20px; font-size: 12px; }
            
            .clause { margin-bottom: 20px; text-align: justify; font-size: 12px; }
            .sub-clause { margin-left: 30px; margin-bottom: 2px; }
            
            .line-fill { display: inline-block; border-bottom: 1px solid #000; width: 300px; }
            .line-fill-long { display: block; border-bottom: 1px solid #000; width: 100%; margin-top: 25px; margin-bottom: 5px; }
            .text-center-sm { text-align: center; font-size: 11px; }
            
            .page-break { page-break-before: always; }
            .page-number { text-align: right; font-size: 12px; font-weight: bold; text-decoration: underline; margin-top: 40px; margin-bottom: 20px; }
            
            .signature-box { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 2px solid #000; border-left: 2px solid #000; margin-top: 20px; }
            .signature-box div { border-right: 2px solid #000; border-bottom: 2px solid #000; padding: 5px 5px 60px 5px; font-size: 12px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="watermark"></div>
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
          <div class="title">HOSPITAL CONSENT FORM</div>
          
          <div class="date-row">DATE / TIME :- <span>${new Date().toLocaleString()}</span></div>
          
          <div class="info-row">PATIENT FULL NAME:- <span>${patient.name}</span></div>
          <div class="info-row">AGE / GENDER - <span>${patient.age} / ${patient.gender}</span> MARITIAL STATUS - <span>${patient.maritalStatus || ''}</span> CHILD - <span>${patient.child || ''}</span></div>
          <div class="info-row">OCCUPATION - <span>${patient.occupation || ''}</span> RELIGION- <span>${patient.religion || ''}</span> CAST- <span>${patient.caste || ''}</span></div>
          <div class="info-row">CITY- <span>${patient.city || ''}</span> STATE- <span>${patient.state || ''}</span> PIN NO :- <span>${patient.pincode || ''}</span></div>
          <div class="info-row">(1) MO NO ,:- <span>${patient.phone}</span> (2) MO NO.:- <span></span></div>
          <div class="info-row">CURRENTLY WITH RELATIVE NAME :- <span>${patient.relativeName || ''}</span></div>
          <div class="info-row">RELATION :- <span>${patient.relation || ''}</span> MO NO OF RELATIVE :- <span>${patient.relativePhone || ''}</span></div>
          <div class="info-row">PATIENT ADDRESS :- <span>${patient.addressLine || ''}</span></div>
          <div class="info-row">RELATIVE ADDRESS :- <span>${patient.relativeAddress || ''}</span></div>
          
          <div class="info-row" style="margin-top: 20px;"><span class="blue-text" style="border: none; flex: 0;">Dr. INCHARGE -</span> <span>${patient.doctor}</span> <span class="blue-text" style="border: none; flex: 0;">MEDICAL OFFICER -</span> <span></span></div>
          
          <div class="member-note">
            <u>TO THE MEMBER:</u> You have been given information about your condition and the recommended surgical, medical, or diagnostic procedure(s). This consent form is designed to provide a written confirmation of these discussions.
          </div>
          
          <div class="clause">
            1. &nbsp;&nbsp;&nbsp;&nbsp; <span class="line-fill"></span> has explained to me that I have the following condition(s):
            <div class="text-center-sm" style="width: 330px;">(Clinician)</div>
            <span class="line-fill-long"></span>
            <div class="text-center-sm">(explain in lay terms)</div>
          </div>
          
          <div class="clause">
            2. The following procedure/intervention/anesthesia (if any) has been recommended:
          </div>
          
          <div class="page-number">P - 01 Of 02</div>
          
          <div class="page-break"></div>
          
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
          <div class="title">HOSPITAL CONSENT FORM</div>
          
          <span class="line-fill-long" style="margin-top: 50px;"></span>
          <div class="text-center-sm">(explain in lay terms)</div>
          
          <div class="clause" style="margin-top: 15px;">
            3. The following have been explained to me about the procedure/intervention/anesthesia (if any):
            <div class="sub-clause">a. &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Its purpose and nature.</div>
            <div class="sub-clause">b. &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; The potential benefits and risks.</div>
            <div class="sub-clause">c. &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; The likely result if I do not have the recommended procedure/intervention.</div>
            <div class="sub-clause">d. &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; The available alternative treatments and their benefits and risks.</div>
          </div>
          
          <div class="clause">
            4. The most likely and most serious risks of the procedure(s) are:
            <span class="line-fill-long" style="margin-top: 15px; width: 90%; margin-left: 5%;"></span>
          </div>
          
          <div class="clause">
            5. I am aware that there may be other risks or complications not discussed that may occur. I also understand that during the course of the proposed procedure, unforeseen conditions may be revealed requiring the performance of additional procedures, and I authorize such procedures to be performed. I acknowledge that no guarantees or promises have been made to me concerning the results of this procedure or any treatment that may be required as a result of this procedure.
          </div>
          
          <div class="clause">
            6. I understand what has been discussed with me as well as the contents of this form. I have been given the opportunity to ask questions and have received satisfactory answers. If you have not had all of your questions answered to your satisfaction, do not sign this form until you have.
          </div>
          
          <div class="clause">
            7. I voluntarily consent to the performance of the procedure/intervention/anesthesia (if any) described above by my clinician or those who work with him/her.
          </div>
          
          <div class="signature-box">
            <div>Patient Name</div>
            <div>Patient Signature</div>
            <div>Patient Thumb</div>
            <div>Witness Name</div>
            <div>Witness Signature</div>
            <div>Witness Thumb</div>
            <div>Physician Name</div>
            <div>Physician Signature</div>
            <div>Physician Thumb</div>
          </div>
          
          <div class="page-number" style="margin-top: 40px;">P - 02 Of 02</div>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
  };

  return (
    <Dialog open={true} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileCheck className="h-6 w-6 text-primary" />
            Hospital Consent Form
          </DialogTitle>
          <p className="text-sm text-muted-foreground">Please review and confirm all clauses before admitting the patient.</p>
        </DialogHeader>

        <div className="space-y-4 py-4 border-y my-2 text-sm">
          {[
            "1. The clinician has explained the condition(s) to the patient.",
            "2. The recommended procedure/intervention/anesthesia has been explained.",
            "3. The purpose, nature, benefits, risks, and alternatives have been discussed.",
            "4. The most likely and most serious risks of the procedure(s) have been communicated.",
            "5. The patient is aware of potential unforeseen risks and authorizes necessary additional procedures.",
            "6. The patient understands the form and has had all questions answered satisfactorily.",
            "7. The patient voluntarily consent to the performance of the procedure/intervention/anesthesia.",
          ].map((clause, i) => (
            <div key={i} className="flex items-start gap-3 bg-muted/30 p-3 rounded-lg border border-transparent hover:border-border transition-colors">
              <Checkbox 
                id={`clause-${i}`} 
                checked={checked[i] || false} 
                onCheckedChange={() => toggle(i)}
                className="mt-1"
              />
              <Label htmlFor={`clause-${i}`} className="leading-snug cursor-pointer flex-1">
                {clause}
              </Label>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center mt-2">
          <Button variant="outline" onClick={printConsent}>
            <Printer className="h-4 w-4 mr-2" /> Print Consent Form
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={onClose} disabled={!allChecked} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Confirm & Admit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
