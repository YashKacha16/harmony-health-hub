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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useDB } from "@/lib/useStore";
import { receptionService } from "@/services/receptionService";
import { settingsService } from "@/services/settingsService";
import type { PastOperation, Patient } from "@/lib/store";
import numberToWords from "number-to-words";

export const Route = createFileRoute("/reception")({
  head: () => ({
    meta: [
      { title: "Reception — MediCore HMS" },
      { name: "description", content: "Patient registration and receipt generation." },
    ],
  }),
  component: () => (
    <RequireAuth module="Reception" action="Access">
      <AppShell>
        <ReceptionPage />
      </AppShell>
    </RequireAuth>
  ),
});

interface Draft {
  name: string;
  phone: string;
  age: string;
  gender: "Male" | "Female" | "Other";
  weight: string;
  height: string;
  caste: string;
  addressLine: string;
  state: string;
  city: string;
  pincode: string;
  type: "OPD" | "IPD" | "FollowUp";
  department: string; doctor: string; opdChargeId: string;
  hasAllergy: boolean; allergy: string;
  hasDeformity: boolean; deformity: string; complaint: string;
  mediclaim: boolean; insuranceCompany: string; policyNumber: string;
  hasPastOps: boolean; pastOperations: PastOperation[];
  ward: string; wardNumber: string;
  relativeName?: string;
  relation?: string;
  relativePhone?: string;
  relativeAddress?: string;
  maritalStatus?: string;
  child?: string;
  occupation?: string;
  religion?: string;

  isMlc: boolean;
  mlcDrIncharge?: string;
  mlcMedicalOfficer?: string;
  mlcDetailOfMatter?: string;
  mlcDateOfMatter?: string;
  mlcTimeOfMatter?: string;
  mlcCauseOfMatter?: string;
  mlcPlaceOfMatter?: string;
  mlcAnyOfHospitalisedPastHO?: string;
  mlcCurrentCondition?: string;
  mlcNameOfFiller?: string;
  mlcFillerMoNo?: string;
  mlcPermanentAddress?: string;
  mlcPermanentSameAsCurrent: boolean;
  mlcReportedPoliceStation?: string;
  mlcPoliceInspectorName?: string;
  mlcPoliceStationAddress?: string;
  mlcFirOrCcNumber?: string;

  isEmergency: boolean;
  emergencyMedicalOfficer?: string;
  emergencyCondition?: string;
  emergencyPastHistory?: string;
  emergencyBp?: string;
  emergencyPulse?: string;
  emergencySpo2?: string;
  emergencyTemp?: string;
  emergencyRr?: string;
  emergencyInvestigations?: string;
  emergencyDoctorsNote?: string;
  emergencyStateInjection?: string;
  emergencyNote?: string;
}

let cachedDraft: Draft | null = null;

function ReceptionPage() {
  const db = useDB();
  const defaultOpdCharge = db.charges.find((c) => c.name === "OPD Charge");

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
    department: db.departments[0]?.name || "", doctor: "", opdChargeId: defaultOpdCharge?.id ?? "",
    hasAllergy: false, allergy: "",
    hasDeformity: false, deformity: "", complaint: "",
    mediclaim: false, insuranceCompany: "", policyNumber: "",
    hasPastOps: false, pastOperations: [],
    ward: "", wardNumber: "",
    relativeName: "", relation: "", relativePhone: "", relativeAddress: "",
    maritalStatus: "", child: "", occupation: "", religion: "",
    isMlc: false, mlcDrIncharge: "", mlcMedicalOfficer: "", mlcDetailOfMatter: "",
    mlcDateOfMatter: "", mlcTimeOfMatter: "", mlcCauseOfMatter: "", mlcPlaceOfMatter: "",
    mlcAnyOfHospitalisedPastHO: "", mlcCurrentCondition: "", mlcNameOfFiller: "", mlcFillerMoNo: "",
    mlcPermanentAddress: "", mlcPermanentSameAsCurrent: false, mlcReportedPoliceStation: "", mlcPoliceInspectorName: "",
    mlcPoliceStationAddress: "", mlcFirOrCcNumber: "",
    isEmergency: false, emergencyMedicalOfficer: "", emergencyCondition: "", emergencyPastHistory: "",
    emergencyBp: "", emergencyPulse: "", emergencySpo2: "", emergencyTemp: "", emergencyRr: "",
    emergencyInvestigations: "", emergencyDoctorsNote: "", emergencyStateInjection: "", emergencyNote: "",
  };

  const [d, setD] = useState<Draft>(cachedDraft || initial);

  useEffect(() => {
    cachedDraft = d;
  }, [d]);

  const [receipt, setReceipt] = useState<Patient | null>(null);
  const [consentPatient, setConsentPatient] = useState<Patient | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const doctors = useMemo(
    () => db.employees.filter((e) => e.department === d.department && e.active),
    [db.employees, d.department],
  );

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((prev) => ({ ...prev, [k]: v }));

  const submit = async () => {
    if (!d.name || !d.phone || !d.age) return toast.error("Fill required patient fields");
    if (d.phone.length !== 10) return toast.error("Phone number must be exactly 10 digits");
    if (!d.department || !d.doctor) return toast.error("Select department and doctor");
    const withFullDemographics = d.type === "IPD" || d.isMlc || d.isEmergency;
    const patient = await receptionService.registerPatient({
      name: d.name,
      phone: d.phone,
      age: Number(d.age),
      gender: d.gender,
      weight: d.weight ? Number(d.weight) : undefined,
      height: d.height ? Number(d.height) : undefined,
      caste: d.caste || undefined,
      addressLine: d.addressLine,
      state: d.state,
      city: d.city,
      pincode: d.pincode,
      type: d.type === "FollowUp" ? "OPD" : d.type,
      department: d.department, doctor: d.doctor,
      opdCharge: db.charges.find((c) => c.id === d.opdChargeId)?.amount ?? 0,
      allergy: d.hasAllergy ? d.allergy : undefined,
      deformity: d.hasDeformity ? d.deformity : undefined,
      complaint: d.complaint || undefined,
      mediclaim: d.mediclaim,
      insuranceCompany: d.mediclaim ? d.insuranceCompany : undefined,
      policyNumber: d.mediclaim ? d.policyNumber : undefined,
      pastOperations: d.hasPastOps ? d.pastOperations : undefined,
      ward: d.type === "IPD" ? d.ward || undefined : undefined,
      wardNumber: d.type === "IPD" ? d.wardNumber || undefined : undefined,
      relativeName: withFullDemographics ? d.relativeName : undefined,
      relation: withFullDemographics ? d.relation : undefined,
      relativePhone: withFullDemographics ? d.relativePhone : undefined,
      relativeAddress: withFullDemographics ? d.relativeAddress : undefined,
      maritalStatus: withFullDemographics ? d.maritalStatus : undefined,
      child: withFullDemographics ? d.child : undefined,
      occupation: withFullDemographics ? d.occupation : undefined,
      religion: withFullDemographics ? d.religion : undefined,
      isMlc: d.isMlc,
      mlcDrIncharge: d.isMlc ? d.mlcDrIncharge : undefined,
      mlcMedicalOfficer: d.isMlc ? d.mlcMedicalOfficer : undefined,
      mlcDetailOfMatter: d.isMlc ? d.mlcDetailOfMatter : undefined,
      mlcDateOfMatter: d.isMlc ? d.mlcDateOfMatter : undefined,
      mlcTimeOfMatter: d.isMlc ? d.mlcTimeOfMatter : undefined,
      mlcCauseOfMatter: d.isMlc ? d.mlcCauseOfMatter : undefined,
      mlcPlaceOfMatter: d.isMlc ? d.mlcPlaceOfMatter : undefined,
      mlcAnyOfHospitalisedPastHO: d.isMlc ? d.mlcAnyOfHospitalisedPastHO : undefined,
      mlcCurrentCondition: d.isMlc ? d.mlcCurrentCondition : undefined,
      mlcNameOfFiller: d.isMlc ? d.mlcNameOfFiller : undefined,
      mlcFillerMoNo: d.isMlc ? d.mlcFillerMoNo : undefined,
      mlcPermanentAddress: d.isMlc && !d.mlcPermanentSameAsCurrent ? d.mlcPermanentAddress : undefined,
      mlcReportedPoliceStation: d.isMlc ? d.mlcReportedPoliceStation : undefined,
      mlcPoliceInspectorName: d.isMlc ? d.mlcPoliceInspectorName : undefined,
      mlcPoliceStationAddress: d.isMlc ? d.mlcPoliceStationAddress : undefined,
      mlcFirOrCcNumber: d.isMlc ? d.mlcFirOrCcNumber : undefined,
      isEmergency: d.isEmergency,
      emergencyMedicalOfficer: d.isEmergency ? d.emergencyMedicalOfficer : undefined,
      emergencyCondition: d.isEmergency ? d.emergencyCondition : undefined,
      emergencyPastHistory: d.isEmergency ? d.emergencyPastHistory : undefined,
      emergencyBp: d.isEmergency ? d.emergencyBp : undefined,
      emergencyPulse: d.isEmergency ? d.emergencyPulse : undefined,
      emergencySpo2: d.isEmergency ? d.emergencySpo2 : undefined,
      emergencyTemp: d.isEmergency ? d.emergencyTemp : undefined,
      emergencyRr: d.isEmergency ? d.emergencyRr : undefined,
      emergencyInvestigations: d.isEmergency ? d.emergencyInvestigations : undefined,
      emergencyDoctorsNote: d.isEmergency ? d.emergencyDoctorsNote : undefined,
      emergencyStateInjection: d.isEmergency ? d.emergencyStateInjection : undefined,
      emergencyNote: d.isEmergency ? d.emergencyNote : undefined,
    });
    if (d.type === "IPD") {
      setConsentPatient(patient);
      toast.success(`IPD patient created — please complete consent form`);
    } else {
      setReceipt(patient);
      toast.success(`Registered — ${patient.code}`);
    }
    setD({ ...initial, department: d.department });
    setSearchQuery("");
    setSearchResults([]);
    setSelectedIndex(-1);
  };

  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await receptionService.searchPatient(searchQuery, true);
        setSearchResults(results);
        setSelectedIndex(-1);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const selectFollowUpPatient = async (p: Patient) => {
    try {
      // Refresh patient to get full details including past operations if needed
      const fullPatient = await receptionService.findByCode(p.code);
      const patientData = fullPatient || p;

      const validityMonths = db.hospitalSettings?.followUpValidityMonths || 3;
      const registeredDate = new Date(patientData.registeredAt);
      const validityDate = new Date(registeredDate);
      validityDate.setMonth(validityDate.getMonth() + validityMonths);

      if (new Date() > validityDate) {
        return toast.error(
          `Follow-up validity period (${validityMonths} months) has expired for this patient.`,
        );
      }

      setD({
        ...initial,
        type: "FollowUp",
        name: patientData.name,
        phone: patientData.phone,
        age: String(patientData.age),
        gender: patientData.gender as any,
        weight: patientData.weight ? String(patientData.weight) : "",
        height: patientData.height ? String(patientData.height) : "",
        caste: patientData.caste || "",
        addressLine: patientData.addressLine,
        state: patientData.state,
        city: patientData.city,
        pincode: patientData.pincode || "",
        department: patientData.department || db.departments[0]?.name || "",
        doctor: patientData.doctor || "",
        hasAllergy: !!patientData.allergy,
        allergy: patientData.allergy || "",
        hasDeformity: !!patientData.deformity,
        deformity: patientData.deformity || "",
        mediclaim: !!patientData.mediclaim,
        insuranceCompany: patientData.insuranceCompany || "",
        policyNumber: patientData.policyNumber || "",
        hasPastOps: !!(patientData.pastOperations && patientData.pastOperations.length > 0),
        pastOperations: patientData.pastOperations || [],
        relativeName: patientData.relativeName || "",
        relation: patientData.relation || "",
        relativePhone: patientData.relativePhone || "",
        relativeAddress: patientData.relativeAddress || "",
        maritalStatus: patientData.maritalStatus || "",
        child: patientData.child || "",
        occupation: patientData.occupation || "",
        religion: patientData.religion || "",
        isMlc: !!patientData.isMlc,
        mlcDrIncharge: patientData.mlcDrIncharge || "",
        mlcMedicalOfficer: patientData.mlcMedicalOfficer || "",
        mlcDetailOfMatter: patientData.mlcDetailOfMatter || "",
        mlcDateOfMatter: patientData.mlcDateOfMatter || "",
        mlcTimeOfMatter: patientData.mlcTimeOfMatter || "",
        mlcCauseOfMatter: patientData.mlcCauseOfMatter || "",
        mlcPlaceOfMatter: patientData.mlcPlaceOfMatter || "",
        mlcAnyOfHospitalisedPastHO: patientData.mlcAnyOfHospitalisedPastHO || "",
        mlcCurrentCondition: patientData.mlcCurrentCondition || "",
        mlcNameOfFiller: patientData.mlcNameOfFiller || "",
        mlcFillerMoNo: patientData.mlcFillerMoNo || "",
        mlcPermanentAddress: patientData.mlcPermanentAddress || "",
        mlcPermanentSameAsCurrent: !!patientData.isMlc && !patientData.mlcPermanentAddress,
        mlcReportedPoliceStation: patientData.mlcReportedPoliceStation || "",
        mlcPoliceInspectorName: patientData.mlcPoliceInspectorName || "",
        mlcPoliceStationAddress: patientData.mlcPoliceStationAddress || "",
        mlcFirOrCcNumber: patientData.mlcFirOrCcNumber || "",
        isEmergency: !!patientData.isEmergency,
        emergencyMedicalOfficer: patientData.emergencyMedicalOfficer || "",
        emergencyCondition: patientData.emergencyCondition || "",
        emergencyPastHistory: patientData.emergencyPastHistory || "",
        emergencyBp: patientData.emergencyBp || "",
        emergencyPulse: patientData.emergencyPulse || "",
        emergencySpo2: patientData.emergencySpo2 || "",
        emergencyTemp: patientData.emergencyTemp || "",
        emergencyRr: patientData.emergencyRr || "",
        emergencyInvestigations: patientData.emergencyInvestigations || "",
        emergencyDoctorsNote: patientData.emergencyDoctorsNote || "",
        emergencyStateInjection: patientData.emergencyStateInjection || "",
        emergencyNote: patientData.emergencyNote || "",
      });
      toast.success("Patient details loaded for follow-up.");
      setShowResults(false);
      setSearchQuery("");
      setSelectedIndex(-1);
    } catch (err) {
      toast.error("Error loading patient details.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showResults || searchResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < searchResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
        selectFollowUpPatient(searchResults[selectedIndex]);
      } else if (searchResults.length > 0) {
        selectFollowUpPatient(searchResults[0]);
      }
    } else if (e.key === "Escape") {
      setShowResults(false);
    }
  };

  const addOp = () =>
    set("pastOperations", [
      ...d.pastOperations,
      { type: "", bodyPart: "", place: "", deformity: "" },
    ]);
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
          <p className="text-sm text-muted-foreground">
            Register new patients and generate their receipt.
          </p>
        </div>
      </div>

      <Tabs
        value={d.type}
        onValueChange={(v) => {
          set("type", v as "OPD" | "IPD" | "FollowUp");
          if (v !== "FollowUp") {
            setSearchQuery("");
            setSearchResults([]);
          }
        }}
      >
        <TabsList className="mb-4">
          <TabsTrigger value="OPD">OPD Registration</TabsTrigger>
          <TabsTrigger value="IPD">IPD Registration</TabsTrigger>
          <TabsTrigger value="FollowUp">Follow-up Registration</TabsTrigger>
        </TabsList>

        <Card>
          <CardContent className="p-6 space-y-8">
            {d.type === "FollowUp" && (
              <Section title="Search Patient">
                <div className="relative max-w-sm">
                  <Input
                    placeholder="Search by name or code..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowResults(true);
                    }}
                    onFocus={() => setShowResults(true)}
                    onKeyDown={handleKeyDown}
                    onBlur={() => setTimeout(() => setShowResults(false), 200)}
                  />
                  {showResults && searchQuery && (
                    <div className="absolute z-10 w-full mt-1 bg-popover text-popover-foreground rounded-md border shadow-md overflow-hidden">
                      {isSearching ? (
                        <div className="p-3 text-sm text-center text-muted-foreground">
                          Searching...
                        </div>
                      ) : searchResults.length > 0 ? (
                        <div className="max-h-60 overflow-auto">
                          {searchResults.map((p, idx) => (
                            <div
                              key={p.id}
                              className={`px-3 py-2 cursor-pointer hover:bg-muted text-sm border-b last:border-0 ${selectedIndex === idx ? "bg-muted font-medium" : ""}`}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                selectFollowUpPatient(p);
                              }}
                            >
                              <div className="font-medium">{p.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {p.code} • {p.phone}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 text-sm text-center text-muted-foreground">
                          No patients found.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Section>
            )}

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
                    <Field label="Child"><Input value={d.child} maxLength={2} onChange={(e) => set("child", e.target.value.replace(/\D/g, ""))} placeholder="No. of children" /></Field>
                    <Field label="Occupation"><Input value={d.occupation} onChange={(e) => set("occupation", e.target.value)} /></Field>
                    <Field label="Religion"><Input value={d.religion} onChange={(e) => set("religion", e.target.value)} /></Field>
                  </>
                )}
              </div>
            </Section>

            <Section title="Address">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Field label="Address line" className="lg:col-span-2">
                  <Input
                    value={d.addressLine}
                    onChange={(e) => set("addressLine", e.target.value)}
                  />
                </Field>
                <Field label="City">
                  <Input value={d.city} onChange={(e) => set("city", e.target.value)} />
                </Field>
                <Field label="State">
                  <Input value={d.state} onChange={(e) => set("state", e.target.value)} />
                </Field>
              </div>
            </Section>

            {(d.type === "OPD" || d.type === "FollowUp") && (
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
                    <Select value={d.opdChargeId} onValueChange={(v) => set("opdChargeId", v)}>
                      <SelectTrigger><SelectValue placeholder="Select charge" /></SelectTrigger>
                      <SelectContent>
                        {db.charges.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} (₹{c.amount})
                          </SelectItem>
                        ))}
                        {db.charges.length === 0 && <SelectItem value="__none" disabled>No charges available</SelectItem>}
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
                </div>
                <div className="mt-3 grid sm:grid-cols-2 gap-4">
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
                  <Field label="Relative Name">
                    <Input
                      value={d.relativeName}
                      onChange={(e) => set("relativeName", e.target.value)}
                    />
                  </Field>
                  <Field label="Relation">
                    <Input value={d.relation} onChange={(e) => set("relation", e.target.value)} />
                  </Field>
                  <Field label="Mobile No. of Relative">
                    <Input
                      value={d.relativePhone}
                      maxLength={10}
                      onChange={(e) => set("relativePhone", e.target.value.replace(/\D/g, ""))}
                    />
                  </Field>
                  <Field label="Relative Address" className="lg:col-span-3">
                    <Input
                      value={d.relativeAddress}
                      onChange={(e) => set("relativeAddress", e.target.value)}
                    />
                  </Field>
                </div>
              </Section>
            )}

            <Section title="Medical history">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="hasAllergy"
                      checked={d.hasAllergy}
                      onCheckedChange={(v) => {
                        set("hasAllergy", !!v);
                        if (!v) set("allergy", "");
                      }}
                    />
                    <Label htmlFor="hasAllergy">Any type of allergy</Label>
                  </div>
                  {d.hasAllergy && (
                    <Field label="Please specify allergy">
                      <Input value={d.allergy} onChange={(e) => set("allergy", e.target.value)} />
                    </Field>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="hasDeformity"
                      checked={d.hasDeformity}
                      onCheckedChange={(v) => {
                        set("hasDeformity", !!v);
                        if (!v) set("deformity", "");
                      }}
                    />
                    <Label htmlFor="hasDeformity">Any type of deformity</Label>
                  </div>
                  {d.hasDeformity && (
                    <Field label="Please specify deformity">
                      <Input
                        value={d.deformity}
                        onChange={(e) => set("deformity", e.target.value)}
                      />
                    </Field>
                  )}
                </div>

                <Field label="Complaint" className="sm:col-span-2">
                  <Textarea
                    rows={3}
                    value={d.complaint}
                    onChange={(e) => set("complaint", e.target.value)}
                  />
                </Field>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Checkbox
                  id="mediclaim"
                  checked={d.mediclaim}
                  onCheckedChange={(v) => set("mediclaim", !!v)}
                />
                <Label htmlFor="mediclaim">Mediclaim / Insurance</Label>
              </div>
              {d.mediclaim && (
                <div className="grid sm:grid-cols-2 gap-4 mt-3">
                  <Field label="Insurance company">
                    <Input
                      value={d.insuranceCompany}
                      onChange={(e) => set("insuranceCompany", e.target.value)}
                    />
                  </Field>
                  <Field label="Policy number">
                    <Input
                      value={d.policyNumber}
                      onChange={(e) => set("policyNumber", e.target.value)}
                    />
                  </Field>
                </div>
              )}

              <div className="mt-4 flex items-center gap-2">
                <Checkbox
                  id="pastops"
                  checked={d.hasPastOps}
                  onCheckedChange={(v) => {
                    set("hasPastOps", !!v);
                    if (v && d.pastOperations.length === 0) addOp();
                  }}
                />
                <Label htmlFor="pastops">Any type of operation in past</Label>
              </div>
              {d.hasPastOps && (
                <div className="mt-3 space-y-3">
                  {d.pastOperations.map((op, i) => (
                    <div
                      key={i}
                      className="grid sm:grid-cols-4 gap-3 items-end rounded-lg border p-3 bg-muted/30"
                    >
                      <Field label="Operation type">
                        <Input value={op.type} onChange={(e) => updOp(i, "type", e.target.value)} />
                      </Field>
                      <Field label="Body part">
                        <Input
                          value={op.bodyPart}
                          onChange={(e) => updOp(i, "bodyPart", e.target.value)}
                        />
                      </Field>
                      <Field label="Place / hospital">
                        <Input
                          value={op.place}
                          onChange={(e) => updOp(i, "place", e.target.value)}
                        />
                      </Field>
                      <div className="flex gap-2">
                        <Field label="Deformity" className="flex-1">
                          <Input
                            value={op.deformity}
                            onChange={(e) => updOp(i, "deformity", e.target.value)}
                          />
                        </Field>
                        <Button variant="ghost" size="icon" onClick={() => rmOp(i)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addOp}>
                    <Plus className="h-4 w-4 mr-1" /> Add operation
                  </Button>
                </div>
              )}
            </Section>

            <Section title="Emergency Case">
              <div className="flex items-center gap-2 mb-4">
                <Checkbox id="isEmergency" checked={d.isEmergency} onCheckedChange={(v) => set("isEmergency", !!v)} />
                <Label htmlFor="isEmergency" className="font-semibold text-rose-600 dark:text-rose-400 cursor-pointer">
                  Is this an Emergency Case?
                </Label>
              </div>
              {d.isEmergency && (
                <div className="space-y-5 border border-rose-500/30 p-4 rounded-lg bg-rose-500/5">
                  {d.type !== "IPD" && (
                    <Group title="Patient & Relative Information">
                      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Field label="Occupation"><Input value={d.occupation} onChange={(e) => set("occupation", e.target.value)} /></Field>
                        <Field label="Relative Name"><Input value={d.relativeName} onChange={(e) => set("relativeName", e.target.value)} /></Field>
                        <Field label="Relation"><Input value={d.relation} onChange={(e) => set("relation", e.target.value)} /></Field>
                        <Field label="Mobile No. of Relative"><Input value={d.relativePhone} maxLength={10} onChange={(e) => set("relativePhone", e.target.value.replace(/\D/g, ''))} /></Field>
                        <Field label="Relative Address" className="lg:col-span-4"><Input value={d.relativeAddress} onChange={(e) => set("relativeAddress", e.target.value)} /></Field>
                      </div>
                    </Group>
                  )}

                  <Group title="Attending Medical Staff">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Field label="Medical Officer"><Input value={d.emergencyMedicalOfficer} onChange={(e) => set("emergencyMedicalOfficer", e.target.value)} placeholder="e.g. Dr. Patel" /></Field>
                    </div>
                  </Group>

                  <Group title="Clinical Assessment">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Field label="Health Condition"><Textarea rows={2} value={d.emergencyCondition} onChange={(e) => set("emergencyCondition", e.target.value)} placeholder="Current health condition..." /></Field>
                      <Field label="Any of Hospitalised Past H/O"><Textarea rows={2} value={d.emergencyPastHistory} onChange={(e) => set("emergencyPastHistory", e.target.value)} placeholder="Past hospitalization history..." /></Field>
                    </div>
                  </Group>

                  <Group title="Vitals">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <Field label="B.P."><Input value={d.emergencyBp} onChange={(e) => set("emergencyBp", e.target.value)} placeholder="120/80" /></Field>
                      <Field label="PULSE"><Input value={d.emergencyPulse} onChange={(e) => set("emergencyPulse", e.target.value)} placeholder="72" /></Field>
                      <Field label="SPo2"><Input value={d.emergencySpo2} onChange={(e) => set("emergencySpo2", e.target.value)} placeholder="98%" /></Field>
                      <Field label="TEM&quot;"><Input value={d.emergencyTemp} onChange={(e) => set("emergencyTemp", e.target.value)} placeholder="98.6" /></Field>
                      <Field label="R.R."><Input value={d.emergencyRr} onChange={(e) => set("emergencyRr", e.target.value)} placeholder="18" /></Field>
                    </div>
                  </Group>

                  <Group title="Clinical Notes & Orders">
                    <div className="grid sm:grid-cols-3 gap-4">
                      <Field label="Investigations"><Textarea rows={3} value={d.emergencyInvestigations} onChange={(e) => set("emergencyInvestigations", e.target.value)} placeholder="Investigations..." /></Field>
                      <Field label="Doctor's Note"><Textarea rows={3} value={d.emergencyDoctorsNote} onChange={(e) => set("emergencyDoctorsNote", e.target.value)} placeholder="Doctor's clinical notes..." /></Field>
                      <Field label="State Injection (Stat)"><Textarea rows={3} value={d.emergencyStateInjection} onChange={(e) => set("emergencyStateInjection", e.target.value)} placeholder="Stat injections..." /></Field>
                      <Field label="Note" className="sm:col-span-3"><Input value={d.emergencyNote} onChange={(e) => set("emergencyNote", e.target.value)} placeholder="Additional notes..." /></Field>
                    </div>
                  </Group>
                </div>
              )}
            </Section>

            <Section title="Medico-Legal Case (MLC)">
              <div className="flex items-center gap-2 mb-4">
                <Checkbox id="isMlc" checked={d.isMlc} onCheckedChange={(v) => set("isMlc", !!v)} />
                <Label htmlFor="isMlc">Is this a Medico-Legal Case (MLC)?</Label>
              </div>
              {d.isMlc && (
                <div className="space-y-5 border p-4 rounded-lg bg-muted/20">
                  {d.type !== "IPD" && (
                    <Group title="Patient particulars">
                      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                        <Field label="Child"><Input value={d.child} maxLength={2} onChange={(e) => set("child", e.target.value.replace(/\D/g, ""))} placeholder="No. of children" /></Field>
                        <Field label="Occupation"><Input value={d.occupation} onChange={(e) => set("occupation", e.target.value)} /></Field>
                        <Field label="Religion"><Input value={d.religion} onChange={(e) => set("religion", e.target.value)} /></Field>
                      </div>
                    </Group>
                  )}

                  {d.type !== "IPD" && (
                    <Group title="Relative currently with patient">
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Field label="Relative Name"><Input value={d.relativeName} onChange={(e) => set("relativeName", e.target.value)} /></Field>
                        <Field label="Relation"><Input value={d.relation} onChange={(e) => set("relation", e.target.value)} /></Field>
                        <Field label="Mobile No. of Relative"><Input value={d.relativePhone} maxLength={10} onChange={(e) => set("relativePhone", e.target.value.replace(/\D/g, ''))} /></Field>
                        <Field label="Relative Address" className="lg:col-span-3"><Input value={d.relativeAddress} onChange={(e) => set("relativeAddress", e.target.value)} /></Field>
                      </div>
                    </Group>
                  )}

                  <Group title="Address">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Checkbox id="mlcPermanentSameAsCurrent" checked={d.mlcPermanentSameAsCurrent} onCheckedChange={(v) => { set("mlcPermanentSameAsCurrent", !!v); if (v) set("mlcPermanentAddress", ""); }} />
                        <Label htmlFor="mlcPermanentSameAsCurrent">Permanent address same as current address</Label>
                      </div>
                      {!d.mlcPermanentSameAsCurrent && (
                        <Field label="Permanent Address"><Textarea rows={2} value={d.mlcPermanentAddress} onChange={(e) => set("mlcPermanentAddress", e.target.value)} /></Field>
                      )}
                    </div>
                  </Group>

                  <Group title="Case details">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <Field label="Date of Matter"><Input type="date" value={d.mlcDateOfMatter} onChange={(e) => set("mlcDateOfMatter", e.target.value)} /></Field>
                      <Field label="Time of Matter"><Input type="time" value={d.mlcTimeOfMatter} onChange={(e) => set("mlcTimeOfMatter", e.target.value)} /></Field>
                      <Field label="Cause of Matter"><Input value={d.mlcCauseOfMatter} onChange={(e) => set("mlcCauseOfMatter", e.target.value)} /></Field>
                      <Field label="Place of Matter"><Input value={d.mlcPlaceOfMatter} onChange={(e) => set("mlcPlaceOfMatter", e.target.value)} /></Field>
                      <Field label="Any Hospitalized Past H/O" className="lg:col-span-3"><Input value={d.mlcAnyOfHospitalisedPastHO} onChange={(e) => set("mlcAnyOfHospitalisedPastHO", e.target.value)} /></Field>
                      <Field label="Detail of Matter" className="lg:col-span-3"><Textarea rows={2} value={d.mlcDetailOfMatter} onChange={(e) => set("mlcDetailOfMatter", e.target.value)} /></Field>
                      <Field label="Current Condition" className="lg:col-span-3"><Textarea rows={2} value={d.mlcCurrentCondition} onChange={(e) => set("mlcCurrentCondition", e.target.value)} /></Field>
                    </div>
                  </Group>

                  <Group title="Police information">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <Field label="Reported Police Station"><Input value={d.mlcReportedPoliceStation} onChange={(e) => set("mlcReportedPoliceStation", e.target.value)} /></Field>
                      <Field label="Name of PI (Police Inspector)"><Input value={d.mlcPoliceInspectorName} onChange={(e) => set("mlcPoliceInspectorName", e.target.value)} /></Field>
                      <Field label="FIR / CC Number"><Input value={d.mlcFirOrCcNumber} onChange={(e) => set("mlcFirOrCcNumber", e.target.value)} /></Field>
                      <Field label="Connected Police Station Address" className="lg:col-span-3"><Input value={d.mlcPoliceStationAddress} onChange={(e) => set("mlcPoliceStationAddress", e.target.value)} /></Field>
                    </div>
                  </Group>

                  <Group title="Attending officials & filler">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Field label="Dr. Incharge"><Input value={d.mlcDrIncharge} onChange={(e) => set("mlcDrIncharge", e.target.value)} /></Field>
                      <Field label="Medical Officer"><Input value={d.mlcMedicalOfficer} onChange={(e) => set("mlcMedicalOfficer", e.target.value)} /></Field>
                      <Field label="Name of Filler"><Input value={d.mlcNameOfFiller} onChange={(e) => set("mlcNameOfFiller", e.target.value)} /></Field>
                      <Field label="Filler Mo No."><Input value={d.mlcFillerMoNo} maxLength={10} onChange={(e) => set("mlcFillerMoNo", e.target.value.replace(/\D/g, ''))} /></Field>
                    </div>
                  </Group>
                </div>
              )}
            </Section>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setD(initial)}>
                Reset
              </Button>
              <Button onClick={submit}>Register patient</Button>
            </div>
          </CardContent>
        </Card>
      </Tabs>

      <Dialog open={!!receipt} onOpenChange={(v) => !v && setReceipt(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registration Receipt</DialogTitle>
          </DialogHeader>
          {receipt && <Receipt patient={receipt} settings={db.hospitalSettings} />}
          <div className="flex justify-end gap-2 no-print flex-wrap">
            <Button variant="outline" onClick={() => setReceipt(null)}>
              Close
            </Button>
            {receipt?.isEmergency && (
              <Button
                variant="destructive"
                onClick={() => receipt && handlePrintEmergency(receipt, db.hospitalSettings)}
              >
                <Printer className="h-4 w-4 mr-2" /> Print Emergency Form
              </Button>
            )}
            {receipt?.isMlc && (
              <Button
                variant="secondary"
                onClick={() => receipt && handlePrintMlc(receipt, db.hospitalSettings)}
              >
                <Printer className="h-4 w-4 mr-2" /> Print MLC
              </Button>
            )}
            <Button onClick={() => receipt && handlePrintReceipt(receipt, db.hospitalSettings)}>
              <Printer className="h-4 w-4 mr-2" /> Print receipt
            </Button>
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
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}
function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={`space-y-1.5 ${className}`}><Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>{children}</div>;
}
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{title}</h4>
      {children}
    </div>
  );
}

function Receipt({ patient, settings }: { patient: Patient; settings?: any }) {
  const logoSrc = '/lifecare-logo.jpg';
  let words = "";
  try {
    words = numberToWords
      .toWords(Math.round(patient.opdCharge || 0))
      .replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    words = `${patient.opdCharge}`;
  }
  const dt = new Date(patient.registeredAt);

  return (
    <div className="mx-auto w-full max-w-[760px] bg-white p-5 font-sans text-[11px] font-bold leading-relaxed text-[#111] print:max-w-none print:p-0">
      {/* Header */}
      <div className="relative mb-6 mt-2 flex h-[110px] items-center overflow-visible rounded-[36px] bg-[#4b4b4b] print:mb-5">
        {/* <div className="box-border flex h-full w-[calc(100%-145px)] items-center overflow-hidden rounded-l-[36px] bg-white p-2">
        <img
          src={logoSrc}
          alt="LifeCare Hospital"
          className="h-full w-full object-contain object-left"
        />
      </div> */}

        <div className="box-border flex h-full w-[calc(100%-130px)] min-w-0 items-center justify-center overflow-hidden rounded-l-[36px] bg-white p-1">
          <img
            src={logoSrc}
            alt="LifeCare Hospital"
            className="block h-full w-full object-inherit object-center"
          />
        </div>

        <div className="absolute right-3 top-1/2 z-10 flex h-[125px] w-[125px] -translate-y-1/2 flex-col items-center justify-center rounded-full border-[5px] border-white bg-white text-center shadow-md">
          <span className="text-[11px] font-semibold leading-5 text-[#e53e3e]">Help Line :</span>
          <span className="text-[12px] font-bold leading-5 text-[#e53e3e]">
            {settings?.helpline || "7016124362"}
          </span>
        </div>
      </div>

      {/* Hospital Address */}
      <div className="mb-5 px-2 text-center text-[11px] font-bold uppercase leading-relaxed tracking-wide text-[#333]">
        {settings?.address || "BHAVNATH PARK-2 , HARIDHAVA MAIN ROAD , RAJKOT"}
      </div>

      {/* Receipt Title */}
      <div className="mb-5 flex items-end justify-between gap-3 border-b-2 border-[#555] pb-2">
        <div className="text-[15px] font-bold uppercase tracking-wide text-[#ff6b6b] underline decoration-1 underline-offset-4">
          Registration &amp; Consultation Receipt
        </div>
        <div className="shrink-0 text-right text-[11px] font-bold text-[#719bb3] underline decoration-1 underline-offset-4">
          {dt.toLocaleDateString()}
        </div>
      </div>

      {/* Patient Details */}
      <div className="mb-5 space-y-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <span className="shrink-0 uppercase">Patient:</span>
          <span className="min-w-[180px] flex-1 border-b border-dotted border-[#333] px-2 pb-1 text-[#444]">
            {patient.name}
          </span>

          <span className="shrink-0 uppercase">Patient Code:</span>
          <span className="min-w-[90px] flex-1 border-b border-dotted border-[#333] px-2 pb-1 text-[#444]">
            {patient.code}
          </span>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <span className="shrink-0 uppercase">Age:</span>
          <span className="min-w-[45px] flex-1 border-b border-dotted border-[#333] px-2 pb-1 text-[#444]">
            {patient.age}
          </span>

          <span className="shrink-0 uppercase">Gender:</span>
          <span className="min-w-[75px] flex-1 border-b border-dotted border-[#333] px-2 pb-1 text-[#444]">
            {patient.gender}
          </span>

          <span className="shrink-0 uppercase">Visit Type:</span>
          <span className="min-w-[90px] flex-1 border-b border-dotted border-[#333] px-2 pb-1 text-[#444]">
            {patient.type}
          </span>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <span className="shrink-0 uppercase">Doctor:</span>
          <span className="min-w-[180px] flex-1 border-b border-dotted border-[#333] px-2 pb-1 text-[#444]">
            {patient.doctor || "-"}
          </span>

          <span className="shrink-0 uppercase">Department:</span>
          <span className="min-w-[120px] flex-1 border-b border-dotted border-[#333] px-2 pb-1 text-[#444]">
            {patient.department}
          </span>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <span className="shrink-0 uppercase">City:</span>
          <span className="min-w-[100px] flex-1 border-b border-dotted border-[#333] px-2 pb-1 text-[#444]">
            {patient.city || "-"}
          </span>

          <span className="shrink-0 uppercase">Phone:</span>
          <span className="min-w-[140px] flex-1 border-b border-dotted border-[#333] px-2 pb-1 text-[#444]">
            {patient.phone || "-"}
          </span>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
          <span className="shrink-0 uppercase">Date:</span>
          <span className="min-w-[100px] flex-1 border-b border-dotted border-[#333] px-2 pb-1 text-[#444]">
            {dt.toLocaleDateString()}
          </span>

          <span className="shrink-0 uppercase">Time:</span>
          <span className="min-w-[100px] flex-1 border-b border-dotted border-[#333] px-2 pb-1 text-[#444]">
            {dt.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>

        <div className="flex items-baseline gap-3">
          <span className="shrink-0 uppercase">Address:</span>
          <span className="h-6 flex-1 border-b border-dotted border-[#333] px-2 text-[#444]">
            {patient.city || "-"}
          </span>
        </div>
      </div>

      {/* Charges Table — same data */}
      <div className="mb-3 overflow-hidden border border-[#555]">
        <table className="w-full border-collapse text-left text-[11px]">
          <thead>
            <tr className="bg-[#4b4b4b] text-white">
              <th className="w-10 border-r border-white/40 px-2 py-2 text-center font-bold">No.</th>
              <th className="border-r border-white/40 px-3 py-2 font-bold">
                Description / Particulars
              </th>
              <th className="w-32 border-r border-white/40 px-3 py-2 font-bold">Department</th>
              <th className="w-28 px-3 py-2 text-right font-bold">Amount (₹)</th>
            </tr>
          </thead>

          <tbody>
            <tr className="border-b border-[#aaa]">
              <td className="border-r border-[#aaa] px-2 py-3 text-center align-top">1</td>
              <td className="border-r border-[#aaa] px-3 py-3 align-top">
                <div className="font-bold text-[#222]">
                  Registration &amp; OPD Consultation Charge
                </div>
                <div className="mt-1 text-[10px] font-normal text-[#666]">
                  Initial OPD patient visit &amp; consultation fee
                </div>
              </td>
              <td className="border-r border-[#aaa] px-3 py-3 align-top font-semibold">
                {patient.department}
              </td>
              <td className="px-3 py-3 text-right align-top font-bold">
                ₹ {patient.opdCharge.toFixed(2)}
              </td>
            </tr>

            <tr className="bg-[#f7f5f2]">
              <td colSpan={2} className="border-r border-[#aaa] px-3 py-3">
                <span className="font-normal italic text-[#555]">Amount in Words:</span>{" "}
                <span className="font-bold text-[#222]">Rupees {words} Only</span>
              </td>
              <td className="border-r border-[#aaa] px-3 py-2 text-right">
                <div>Total:</div>
                <div className="mt-1 text-[#d32f2f]">Paid:</div>
              </td>
              <td className="px-3 py-2 text-right font-bold">
                <div>₹ {patient.opdCharge.toFixed(2)}</div>
                <div className="mt-1 text-[#d32f2f]">₹ {patient.opdCharge.toFixed(2)}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Payment Status — existing information */}
      <div className="mt-4 flex justify-end">
        <div className="border-2 border-[#477b58] px-5 py-1.5 text-[12px] font-bold uppercase tracking-widest text-[#477b58]">
          Paid
        </div>
      </div>
    </div>
  );
}

const handlePrintReceipt = async (patient: Patient, settings: any) => {
  // ── 1. Resolve logo and convert to embedded base64 ──
  const rawLogoSrc = '/lifecare-logo.jpg';
  const absoluteLogoUrl = `${window.location.origin}${rawLogoSrc}`;

  let logoSrc = absoluteLogoUrl;
  try {
    const resp = await fetch(absoluteLogoUrl, {
      mode: 'cors',
      cache: 'force-cache',
      headers: { 'ngrok-skip-browser-warning': 'true' },
    });
    if (resp.ok) {
      const blob = await resp.blob();
      logoSrc = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
  } catch {
    // keep absoluteLogoUrl as fallback
  }

  // ── 2. Prepare receipt data ──
  let words = "";
  try {
    words = numberToWords
      .toWords(Math.round(patient.opdCharge || 0))
      .replace(/\b\w/g, (c) => c.toUpperCase());
    words = numberToWords
      .toWords(Math.round(patient.opdCharge || 0))
      .replace(/\b\w/g, (c) => c.toUpperCase());
  } catch {
    words = `${patient.opdCharge}`;
  }
  const dt = new Date(patient.registeredAt);

  // ── 3. Build self-contained receipt HTML ──
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<base href="${window.location.origin}/"/>
<title>Receipt - ${patient.code}</title>
<style>
@page{size:80mm auto;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:80mm;max-width:80mm;margin:0;padding:0;background:#fff}
body{font-family:'Courier New',Courier,monospace;color:#000;
-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;
line-height:1.35;font-size:11px;padding:3mm}
.pos-header{text-align:center;padding-bottom:0;margin-bottom:0}
.header-row{display:flex;align-items:center;justify-content:space-between;width:100%;margin-bottom:2.5mm}
.logo-col{flex:0 0 68%;max-width:68%;display:flex;align-items:center;justify-content:center}
.pos-logo{width:100%;max-width:100%;height:auto;object-fit:contain;display:block}
.header-divider{width:1px;height:38px;background:#ccc;flex-shrink:0;margin:0 4px}
.hl-col{flex:0 0 28%;max-width:28%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
.hl-l{font-size:9.5px;line-height:1.2;text-align:center;white-space:nowrap;color:#e53e3e}
.hl-n{font-size:15px;font-weight:bold;line-height:1.2;text-align:center;color:#e53e3e}
.addr{font-size:8px;text-transform:uppercase;letter-spacing:.3px}
.dash{border:0;border-top:1px dashed #000;margin:4px 0}
.dbl{border:0;border-top:2px double #000;margin:4px 0}
.stars{text-align:center;font-size:9px;letter-spacing:2px;margin:3px 0}
.title{text-align:center;font-size:12px;font-weight:bold;text-transform:uppercase;
letter-spacing:1px;padding:3px 0}
.meta{display:flex;justify-content:space-between;font-size:9px;padding:1px 0}
.row{display:flex;justify-content:space-between;padding:1.5px 0;font-size:10px}
.row .l{flex-shrink:0}
.row .v{font-weight:bold;text-align:right;word-break:break-word;max-width:55%}
.ih{display:flex;justify-content:space-between;font-weight:bold;font-size:9px;
padding:2px 0;text-transform:uppercase}
.ir{padding:3px 0;font-size:10px}
.in{font-weight:bold}
.id{font-size:8px;padding-left:8px}
.ia{display:flex;justify-content:space-between;padding-left:8px;font-size:10px}
.tr{display:flex;justify-content:space-between;font-size:11px;font-weight:bold;padding:2px 0}
.gt{font-size:13px;font-weight:bold}
.pr{display:flex;justify-content:space-between;font-size:11px;font-weight:bold;padding:1px 0}
.aw{font-size:8px;font-style:italic;text-align:center;padding:3px 0}
.aw strong{font-style:normal}
.ft{text-align:center;font-size:8px;padding-top:4px}
.ft .ty{font-size:11px;font-weight:bold;margin-bottom:2px}
.ft .gw{font-size:9px;margin-bottom:3px}
.sb{display:inline-block;border:1.5px solid #000;padding:1px 10px;
font-size:10px;font-weight:bold;letter-spacing:2px;margin:2px auto}
@media print{
  html,body{width:80mm;max-width:80mm;margin:0;padding:0;background:#fff}
  body{padding:3mm}
}
</style>
</head>
<body>
<div class="pos-header">
<div class="header-row">
<div class="logo-col">
<img src="${logoSrc}" alt="Hospital Logo" class="pos-logo" onerror="this.style.display='none';var fb=document.getElementById('logo-fallback');if(fb)fb.style.display='block';"/>
<div id="logo-fallback" style="display:none;font-weight:bold;font-size:11px;text-align:center;line-height:1.2;">LIFECARE MULTISPECIALIST HOSPITAL</div>
</div>
<div class="header-divider"></div>
<div class="hl-col">
<span class="hl-l">Help Line :</span>
<span class="hl-n">${settings?.helpline || '1234'}</span>
</div>
</div>
<div class="addr">${settings?.address || 'BHAVNATH PARK-2, HARIDHAVA MAIN ROAD, RAJKOT'}</div>
</div>
<hr class="dbl"/>
<div class="title">RECEIPT</div>
<hr class="dash"/>
<div class="meta"><span>Receipt#: <strong>${patient.code}</strong></span><span>${dt.toLocaleDateString()}</span></div>
<div class="meta"><span>Time: ${dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span><span>Type: <strong>${patient.type}</strong></span></div>
<hr class="dash"/>
<div class="row"><span class="l">PATIENT</span><span class="v">${patient.name}</span></div>
<div class="row"><span class="l">AGE / SEX</span><span class="v">${patient.age} Y / ${patient.gender}</span></div>
<div class="row"><span class="l">DOCTOR</span><span class="v">${patient.doctor || "-"}</span></div>
<div class="row"><span class="l">DEPT</span><span class="v">${patient.department}</span></div>
<div class="row"><span class="l">CITY / PH</span><span class="v">${patient.city || "-"} (${patient.phone || "-"})</span></div>
<hr class="dbl"/>
<div class="ih"><span>ITEM</span><span>AMOUNT</span></div>
<hr class="dash"/>
<div class="ir">
<div class="in">1. Reg &amp; OPD Consultation</div>
<div class="id">Dept: ${patient.department}</div>
<div class="ia"><span>Consultation Fee</span><span style="font-weight:bold">Rs.${patient.opdCharge.toFixed(2)}</span></div>
</div>
<hr class="dash"/>
<div class="tr"><span>SUBTOTAL</span><span>Rs.${patient.opdCharge.toFixed(2)}</span></div>
<div class="tr gt"><span>TOTAL</span><span>Rs.${patient.opdCharge.toFixed(2)}</span></div>
<hr class="dbl"/>
<div class="pr"><span>PAID (CASH)</span><span>Rs.${patient.opdCharge.toFixed(2)}</span></div>
<div class="pr"><span>BALANCE DUE</span><span>Rs.0.00</span></div>
<hr class="dash"/>
<div class="aw">Amount: <strong>Rupees ${words} Only</strong></div>
<hr class="dash"/>
<div style="text-align:center;padding:4px 0"><span class="sb">✓ PAID</span></div>
<hr class="dash"/>
<div class="ft">
<div class="ty">THANK YOU!</div>
<div class="gw">Get Well Soon 🙏</div>
<div>This is a computer generated receipt</div>
<div>No signature required</div>
</div>
<div class="stars">********************************</div>
</body>
</html>`;

  // ── 4. Print via hidden iframe ──
  // Remove old iframe if any (clean state each time)
  const oldFrame = document.getElementById("receipt-print-frame");
  if (oldFrame) oldFrame.remove();

  const iframe = document.createElement("iframe");
  iframe.id = "receipt-print-frame";
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:none;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc || !iframe.contentWindow) return;

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  // Wait for all images inside the iframe to finish loading before printing
  await new Promise<void>((resolve) => {
    const checkAndPrint = () => {
      const imgs = iframeDoc.querySelectorAll("img");
      const pending = Array.from(imgs).filter((img) => !img.complete);
      if (pending.length === 0) {
        resolve();
        return;
      }
      let remaining = pending.length;
      const done = () => { if (--remaining <= 0) resolve(); };
      pending.forEach((img) => {
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      });
    };
    // Small delay to let the document parse
    setTimeout(checkAndPrint, 50);
  });

  // Trigger print
  setTimeout(() => {
    iframe.contentWindow?.print();
  }, 100);
};

export const handlePrintMlc = async (patient: Patient, settings: any) => {
  const rawLogo = settings?.logoUrl && settings.logoUrl !== '/logo.png' && settings.logoUrl !== '/logo.jpg'
    ? settings.logoUrl
    : '/lifecare-logo.jpg';
  const absoluteLogoUrl = rawLogo.startsWith('http') || rawLogo.startsWith('data:')
    ? rawLogo
    : `${window.location.origin}${rawLogo.startsWith('/') ? '' : '/'}${rawLogo}`;

  let logoSrc = absoluteLogoUrl;
  try {
    const resp = await fetch(absoluteLogoUrl, {
      mode: 'cors',
      cache: 'force-cache',
      headers: { 'ngrok-skip-browser-warning': 'true' },
    });
    if (resp.ok) {
      const blob = await resp.blob();
      logoSrc = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
  } catch {
    // keep absoluteLogoUrl fallback
  }

  const oldFrame = document.getElementById("mlc-print-iframe");
  if (oldFrame) oldFrame.remove();

  const printIframe = document.createElement("iframe");
  printIframe.id = "mlc-print-iframe";
  printIframe.style.position = "fixed";
  printIframe.style.top = "-9999px";
  printIframe.style.left = "-9999px";
  printIframe.style.width = "0";
  printIframe.style.height = "0";
  printIframe.style.border = "none";
  document.body.appendChild(printIframe);

  const printWindow = printIframe.contentWindow;
  if (!printWindow) return;

  const content = `
    <html>
      <head>
        <title>M.L.C. Form - ${patient.code}</title>
        <style>
          @page { margin: 0; size: A4; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          html, body { 
            height: 100%;
            margin: 0; 
            padding: 0; 
            background: #fff;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            color: #111; 
            line-height: 1.35; 
            font-size: 12px; 
            font-weight: 600; 
          }
          
          .watermark {
            position: fixed;
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
            width: 88%; 
            max-width: 780px; 
            object-fit: contain; 
            transform: rotate(-45deg); 
            -webkit-transform: rotate(-45deg); 
          }
          
          .page-container {
            box-sizing: border-box;
            width: 100%;
            max-width: 210mm;
            height: 295mm;
            min-height: 295mm;
            max-height: 295mm;
            margin: 0 auto;
            padding: 14px 28px 18px 28px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
            z-index: 1;
            background: transparent;
            overflow: hidden;
          }

          .top-section { 
            background-color: #4b4b4b !important; 
            margin: 0 0 10px 0;
            border-radius: 30px;
            display: flex; 
            align-items: center; 
            justify-content: space-between; 
            height: 86px;
            position: relative;
            flex-shrink: 0;
          }
          .logo-container { 
            background-color: white !important;
            height: 100%;
            width: calc(100% - 130px);
            border-radius: 30px 0 0 30px;
            display: flex;
            align-items: center;
            justify-content: flex-start;
            padding: 0;
            box-sizing: border-box;
          }
          .logo-container img { width: 100%; height: 100%; border-radius: 30px 0 0 30px; object-fit: fill; }
          .helpline-circle {
            background-color: white !important;
            width: 104px;
            height: 104px;
            border-radius: 50%;
            position: absolute;
            right: 14px;
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
          .helpline-title { font-size: 10px; margin-bottom: 2px; }
          .helpline-number { font-size: 13.5px; font-weight: bold; }
          
          .main-body {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-height: 0;
          }

          .title-area { 
            display: flex; 
            justify-content: space-between; 
            align-items: baseline; 
            border-bottom: 1.5px solid #444; 
            padding-bottom: 4px; 
            margin-bottom: 6px; 
          }
          .form-title { 
            color: #ff6b6b; 
            text-decoration: underline; 
            font-size: 13.5px; 
            font-weight: 800; 
            text-transform: uppercase; 
            letter-spacing: 0.5px;
          }
          .date-time { 
            text-decoration: underline; 
            color: #5588a3; 
            font-size: 12px; 
            font-weight: 700;
          }
          
          .form-row { 
            display: flex; 
            flex-wrap: wrap; 
            gap: 8px; 
            align-items: baseline; 
            margin-bottom: 2px;
          }
          .field-label { 
            text-transform: uppercase; 
            white-space: nowrap; 
            color: #111; 
            font-size: 11.5px;
            font-weight: 800;
            letter-spacing: 0.2px;
          }
          .field-value { 
            flex: 1; 
            border-bottom: 1.5px dotted #333; 
            color: #222; 
            padding: 1px 4px; 
            min-width: 40px; 
            font-size: 12.5px;
            font-weight: 700;
          }
          
          .block { 
            margin-bottom: 2px; 
          }
          .block-value { 
            display: block; 
            border-bottom: 1.5px dotted #333; 
            min-height: 32px; 
            padding: 2px 4px; 
            white-space: pre-wrap; 
            color: #222; 
            font-size: 12.5px;
            font-weight: 700;
            line-height: 1.45;
          }

          .sign-section {
            margin-top: 8px;
            padding-top: 24px;
            flex-shrink: 0;
          }
          .sign-row { 
            display: flex; 
            justify-content: space-between; 
            gap: 40px; 
          }
          .sign-cell { 
            flex: 1; 
            border-top: 1.5px solid #000; 
            padding-top: 5px; 
            text-transform: uppercase; 
            font-size: 11px; 
            font-weight: 800;
            text-align: center; 
            letter-spacing: 0.5px;
          }

          @media print {
            html, body {
              width: 210mm;
              height: 297mm;
              margin: 0;
              padding: 0;
              overflow: hidden;
            }
            .page-container {
              width: 210mm;
              height: 295mm;
              min-height: 295mm;
              max-height: 295mm;
              page-break-after: avoid;
              page-break-inside: avoid;
              overflow: hidden;
            }
          }
        </style>
      </head>
      <body>
        <div class="watermark">
          <img src="${logoSrc}" alt="Watermark" onerror="this.src='/lifecare-logo.jpg'" />
        </div>
        <div class="page-container">
          <div class="top-section">
            <div class="logo-container">
              <img src="${logoSrc}" alt="Hospital Logo" onerror="this.src='/lifecare-logo.jpg'" />
            </div>
            <div class="helpline-circle">
              <span class="helpline-title">Help Line :</span>
              <span class="helpline-number">${settings?.helpline || '7016124362'}</span>
            </div>
          </div>

          <div class="main-body">
            <div class="title-area">
              <div class="form-title">Registration and M.L.C. Form</div>
              <div class="date-time">DATE / TIME:- ${patient.mlcDateOfMatter || ''} ${patient.mlcTimeOfMatter || ''}</div>
            </div>

            <div class="form-row">
              <span class="field-label">Patient Full Name -</span>
              <span class="field-value">${patient.name}</span>
            </div>

            <div class="form-row" style="display: flex;">
              <span class="field-label">Age / Gender -</span>
              <span class="field-value" style="flex: 2;">${patient.age} / ${patient.gender}</span>
              <span class="field-label">Marital Status -</span>
              <span class="field-value" style="flex: 2;">${patient.maritalStatus || '-'}</span>
              <span class="field-label">Child -</span>
              <span class="field-value" style="flex: 1;">${patient.child || '-'}</span>
            </div>

            <div class="form-row" style="display: flex;">
              <span class="field-label">Occupation -</span>
              <span class="field-value" style="flex: 2;">${patient.occupation || '-'}</span>
              <span class="field-label">Religion -</span>
              <span class="field-value" style="flex: 2;">${patient.religion || '-'}</span>
              <span class="field-label">Cast -</span>
              <span class="field-value" style="flex: 1;">${patient.caste || '-'}</span>
            </div>

            <div class="form-row" style="display: flex;">
              <span class="field-label">City -</span>
              <span class="field-value" style="flex: 2;">${patient.city || '-'}</span>
              <span class="field-label">State -</span>
              <span class="field-value" style="flex: 2;">${patient.state || '-'}</span>
              <span class="field-label">Pin No., -</span>
              <span class="field-value" style="flex: 1;">${patient.pincode || '-'}</span>
            </div>

            <div class="form-row">
              <span class="field-label">Relative Currently With Name -</span>
              <span class="field-value">${patient.relativeName || '-'}</span>
            </div>

            <div class="form-row" style="display: flex;">
              <span class="field-label">Relation -</span>
              <span class="field-value" style="flex: 1;">${patient.relation || '-'}</span>
              <span class="field-label">Relative Mo No, -</span>
              <span class="field-value" style="flex: 1;">${patient.relativePhone || '-'}</span>
            </div>

            <div class="block">
              <span class="field-label">Current Address -</span>
              <span class="block-value">${patient.addressLine || '-'}</span>
            </div>

            <div class="block">
              <span class="field-label">Permanent Address -</span>
              <span class="block-value">${patient.mlcPermanentAddress || patient.addressLine || '-'}</span>
            </div>

            <div class="form-row" style="display: flex;">
              <span class="field-label">Mo.,No., -</span>
              <span class="field-value" style="flex: 2;">${patient.phone || '-'}</span>
              <span class="field-label">Mediclaim –</span>
              <span class="field-value" style="flex: 1; border: none;">${patient.mediclaim ? 'YES' : 'NO'}</span>
            </div>

            <div class="form-row" style="display: flex;">
              <span class="field-label">Dr. Incharge -</span>
              <span class="field-value" style="flex: 1;">${patient.mlcDrIncharge || patient.doctor || '-'}</span>
              <span class="field-label">Medical Officer -</span>
              <span class="field-value" style="flex: 1;">${patient.mlcMedicalOfficer || patient.doctor || '-'}</span>
            </div>

            <div class="block">
              <span class="field-label">Detail of Matter -</span>
              <span class="block-value">${patient.mlcDetailOfMatter || '-'}</span>
            </div>

            <div class="form-row" style="display: flex;">
              <span class="field-label">Date of Matter -</span>
              <span class="field-value" style="flex: 1;">${patient.mlcDateOfMatter || '-'}</span>
              <span class="field-label">Time of Matter -</span>
              <span class="field-value" style="flex: 1;">${patient.mlcTimeOfMatter || '-'}</span>
            </div>

            <div class="form-row" style="display: flex;">
              <span class="field-label">Cause of Matter -</span>
              <span class="field-value" style="flex: 1;">${patient.mlcCauseOfMatter || '-'}</span>
              <span class="field-label">Place of Matter -</span>
              <span class="field-value" style="flex: 1;">${patient.mlcPlaceOfMatter || '-'}</span>
            </div>

            <div class="block">
              <span class="field-label">Any of Hospitalised Past H/O -</span>
              <span class="block-value">${patient.mlcAnyOfHospitalisedPastHO || '-'}</span>
            </div>

            <div class="block">
              <span class="field-label">Current Condition -</span>
              <span class="block-value">${patient.mlcCurrentCondition || '-'}</span>
            </div>

            <div class="form-row" style="display: flex;">
              <span class="field-label">Reported Police Station -</span>
              <span class="field-value" style="flex: 2;">${patient.mlcReportedPoliceStation || '-'}</span>
              <span class="field-label">Name of PI -</span>
              <span class="field-value" style="flex: 2;">${patient.mlcPoliceInspectorName || '-'}</span>
            </div>

            <div class="form-row" style="display: flex;">
              <span class="field-label">FIR / CC No. -</span>
              <span class="field-value" style="flex: 1;">${patient.mlcFirOrCcNumber || '-'}</span>
              <span class="field-label">Connected Police Station Address -</span>
              <span class="field-value" style="flex: 2;">${patient.mlcPoliceStationAddress || '-'}</span>
            </div>

            <div class="form-row" style="display: flex;">
              <span class="field-label">Name of Filler -</span>
              <span class="field-value" style="flex: 2;">${patient.mlcNameOfFiller || '-'}</span>
              <span class="field-label">Mo No -</span>
              <span class="field-value" style="flex: 1;">${patient.mlcFillerMoNo || '-'}</span>
            </div>
          </div>

          <div class="sign-section">
            <div class="sign-row">
              <div class="sign-cell">Signature</div>
              <div class="sign-cell">Add / Stamp</div>
            </div>
          </div>
        </div>

        <script>
          var printed = false;
          function doPrint() {
            if (printed) return;
            printed = true;
            window.focus();
            window.print();
          }
          if (document.readyState === 'complete') {
            setTimeout(doPrint, 200);
          } else {
            window.addEventListener('load', function() {
              setTimeout(doPrint, 200);
            });
            setTimeout(doPrint, 800);
          }
        </script>
      </body>
    </html>
  `;
  printWindow.document.open();
  printWindow.document.write(content);
  printWindow.document.close();
};

export const handlePrintEmergency = async (patient: Patient, settings: any) => {
  const rawLogo = settings?.logoUrl && settings.logoUrl !== '/logo.png' && settings.logoUrl !== '/logo.jpg'
    ? settings.logoUrl
    : '/lifecare-logo.jpg';
  const absoluteLogoUrl = rawLogo.startsWith('http') || rawLogo.startsWith('data:')
    ? rawLogo
    : `${window.location.origin}${rawLogo.startsWith('/') ? '' : '/'}${rawLogo}`;

  let logoSrc = absoluteLogoUrl;
  try {
    const resp = await fetch(absoluteLogoUrl, {
      mode: 'cors',
      cache: 'force-cache',
      headers: { 'ngrok-skip-browser-warning': 'true' },
    });
    if (resp.ok) {
      const blob = await resp.blob();
      logoSrc = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
  } catch {
    // keep absoluteLogoUrl fallback
  }

  const oldFrame = document.getElementById("emergency-print-iframe");
  if (oldFrame) oldFrame.remove();

  const printIframe = document.createElement("iframe");
  printIframe.id = "emergency-print-iframe";
  printIframe.style.position = "fixed";
  printIframe.style.top = "-9999px";
  printIframe.style.left = "-9999px";
  printIframe.style.width = "0";
  printIframe.style.height = "0";
  printIframe.style.border = "none";
  document.body.appendChild(printIframe);

  const printWindow = printIframe.contentWindow;
  if (!printWindow) return;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB');
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const formattedDateTime = `${dateStr}, ${timeStr}`;

  const addressParts = [patient.addressLine, patient.city, patient.state, patient.pincode].filter(Boolean);
  const fullAddress = addressParts.join(', ');
  const mediclaimStatus = patient.mediclaim
    ? `YES${patient.insuranceCompany ? ` (${patient.insuranceCompany}${patient.policyNumber ? ` - ${patient.policyNumber}` : ''})` : ''}`
    : 'NO';

  const content = `
    <html>
      <head>
        <title>Emergency Form - ${patient.code}</title>
        <style>
          @page { margin: 0; size: A4; }
          * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          html, body { 
            height: 100%;
            margin: 0; 
            padding: 0; 
            background: #fff;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            color: #111; 
            line-height: 1.32; 
            font-size: 11.5px; 
            font-weight: 600; 
          }
          
          .watermark {
            position: fixed;
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
            width: 88%; 
            max-width: 780px; 
            object-fit: contain; 
            transform: rotate(-45deg); 
            -webkit-transform: rotate(-45deg); 
          }
          
          .page-container {
            box-sizing: border-box;
            width: 100%;
            max-width: 210mm;
            height: 295mm;
            min-height: 295mm;
            max-height: 295mm;
            margin: 0 auto;
            padding: 12px 28px 14px 28px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
            z-index: 1;
            background: transparent;
            overflow: hidden;
          }

          .top-section { 
            background-color: #4b4b4b !important; 
            margin: 0 0 8px 0;
            border-radius: 28px;
            display: flex; 
            align-items: center; 
            justify-content: space-between; 
            height: 84px;
            position: relative;
            flex-shrink: 0;
          }
          .logo-container { 
            background-color: white !important;
            height: 100%;
            width: calc(100% - 130px);
            border-radius: 28px 0 0 28px;
            display: flex;
            align-items: center;
            justify-content: flex-start;
            padding: 0;
            box-sizing: border-box;
          }
          .logo-container img { width: 100%; height: 100%; border-radius: 28px 0 0 28px; object-fit: fill; }
          .helpline-circle {
            background-color: white !important;
            width: 100px;
            height: 100px;
            border-radius: 50%;
            position: absolute;
            right: 14px;
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
          .helpline-title { font-size: 10px; margin-bottom: 2px; }
          .helpline-number { font-size: 13px; font-weight: bold; }
          
          .main-body {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-height: 0;
          }

          .title-area { 
            display: flex; 
            justify-content: space-between; 
            align-items: baseline; 
            border-bottom: 1.5px solid #444; 
            padding-bottom: 3px; 
            margin-bottom: 5px; 
          }
          .form-title { 
            color: #e53e3e; 
            text-decoration: underline; 
            font-size: 13.5px; 
            font-weight: 800; 
            text-transform: uppercase; 
            letter-spacing: 0.5px;
          }
          .date-time { 
            text-decoration: underline; 
            color: #1e3a8a; 
            font-size: 11.5px; 
            font-weight: 700;
          }
          
          .form-row { 
            display: flex; 
            flex-wrap: wrap; 
            gap: 6px; 
            align-items: baseline; 
            margin-bottom: 2px;
          }
          .field-label { 
            text-transform: uppercase; 
            white-space: nowrap; 
            color: #1e3a8a; 
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.2px;
          }
          .field-value { 
            flex: 1; 
            border-bottom: 1.5px dotted #333; 
            color: #111; 
            padding: 1px 4px; 
            min-width: 35px; 
            font-size: 11.5px;
            font-weight: 700;
          }
          
          .block { 
            margin-bottom: 2px; 
          }
          .block-value { 
            display: block; 
            border-bottom: 1.5px dotted #333; 
            min-height: 22px; 
            padding: 1px 4px; 
            white-space: pre-wrap; 
            color: #111; 
            font-size: 11.5px;
            font-weight: 700;
            line-height: 1.35;
          }

          .clinical-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 5px;
            margin-bottom: 3px;
            border: 1.5px solid #222;
          }
          .clinical-table th {
            border: 1.5px solid #222;
            background-color: #f1f5f9;
            color: #1e3a8a;
            padding: 4px 6px;
            font-weight: 800;
            text-align: center;
            font-size: 11px;
            letter-spacing: 0.3px;
          }
          .clinical-table td {
            border: 1.5px solid #222;
            height: 195px;
            vertical-align: top;
            padding: 4px;
            position: relative;
          }
          .vitals-subtable {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 4px;
          }
          .vitals-subtable td {
            border: 1px solid #444;
            height: auto;
            padding: 2px 4px;
            font-size: 10.5px;
          }
          .v-label {
            font-weight: 800;
            color: #1e3a8a;
            width: 45%;
            background-color: #f8fafc;
          }
          .v-val {
            font-weight: 700;
            color: #111;
            width: 55%;
          }
          .cell-content {
            white-space: pre-wrap;
            font-size: 11px;
            font-weight: 600;
            color: #111;
            line-height: 1.35;
          }

          .sign-section {
            margin-top: 6px;
            padding-top: 20px;
            flex-shrink: 0;
          }
          .sign-row { 
            display: flex; 
            justify-content: space-between; 
            gap: 25px; 
          }
          .sign-cell { 
            flex: 1; 
            border-top: 1.5px solid #000; 
            padding-top: 4px; 
            text-transform: uppercase; 
            font-size: 10.5px; 
            font-weight: 800;
            text-align: center; 
            letter-spacing: 0.3px;
          }

          @media print {
            html, body {
              width: 210mm;
              height: 297mm;
              margin: 0;
              padding: 0;
              overflow: hidden;
            }
            .page-container {
              width: 210mm;
              height: 295mm;
              min-height: 295mm;
              max-height: 295mm;
              page-break-after: avoid;
              page-break-inside: avoid;
              overflow: hidden;
            }
          }
        </style>
      </head>
      <body>
        <div class="watermark">
          <img src="${logoSrc}" alt="Watermark" onerror="this.src='/lifecare-logo.jpg'" />
        </div>
        <div class="page-container">
          <div class="top-section">
            <div class="logo-container">
              <img src="${logoSrc}" alt="Hospital Logo" onerror="this.src='/lifecare-logo.jpg'" />
            </div>
            <div class="helpline-circle">
              <span class="helpline-title">Help Line :</span>
              <span class="helpline-number">${settings?.helpline || '7016124362'}</span>
            </div>
          </div>

          <div class="main-body">
            <div class="title-area">
              <div class="form-title">EMERGENCY FORM</div>
              <div class="date-time">DATE / TIME :- ${formattedDateTime}</div>
            </div>

            <div class="form-row">
              <span class="field-label">PATIENT FULL NAME -</span>
              <span class="field-value">${patient.name || ''}</span>
            </div>

            <div class="form-row" style="display: flex;">
              <span class="field-label">AGE / GENDER -</span>
              <span class="field-value" style="flex: 2;">${patient.age ? `${patient.age} / ${patient.gender}` : ''}</span>
              <span class="field-label">OCCUPATION -</span>
              <span class="field-value" style="flex: 2;">${patient.occupation || '-'}</span>
              <span class="field-label">CITY -</span>
              <span class="field-value" style="flex: 2;">${patient.city || '-'}</span>
            </div>

            <div class="form-row">
              <span class="field-label">CURRENTLY WITH RELATIVE NAME -</span>
              <span class="field-value">${patient.relativeName || '-'}</span>
            </div>

            <div class="form-row" style="display: flex;">
              <span class="field-label">RELATION -</span>
              <span class="field-value" style="flex: 2;">${patient.relation || '-'}</span>
              <span class="field-label">RELATIVE MO NO. -</span>
              <span class="field-value" style="flex: 2;">${patient.relativePhone || '-'}</span>
            </div>

            <div class="form-row">
              <span class="field-label">PERMANENT ADDRESS -</span>
              <span class="field-value">${fullAddress || '-'}</span>
            </div>

            <div class="form-row" style="display: flex;">
              <span class="field-label">(1) MO NO -</span>
              <span class="field-value" style="flex: 2;">${patient.phone || '-'}</span>
              <span class="field-label">MEDICLAIM -</span>
              <span class="field-value" style="flex: 2;">${mediclaimStatus}</span>
            </div>

            <div class="block">
              <span class="field-label">HEALTH CONDITION -</span>
              <span class="block-value">${patient.emergencyCondition || '-'}</span>
            </div>

            <div class="block">
              <span class="field-label">ANY OF HOSPITALISED PAST H/O -</span>
              <span class="block-value">${patient.emergencyPastHistory || '-'}</span>
            </div>

            <div class="form-row" style="display: flex; margin-bottom: 3px;">
              <span class="field-label">Dr. INCHARGE -</span>
              <span class="field-value" style="flex: 2;">${patient.doctor || '-'}</span>
              <span class="field-label">MEDICAL OFFICER -</span>
              <span class="field-value" style="flex: 2;">${patient.emergencyMedicalOfficer || '-'}</span>
            </div>

            <table class="clinical-table">
              <thead>
                <tr>
                  <th style="width: 27%;">VITALS &amp; INVESTIGATIONS</th>
                  <th style="width: 36.5%;">DOCTORS NOTE</th>
                  <th style="width: 36.5%;">STATE INJECTION</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="vertical-align: top; padding: 4px;">
                    <table class="vitals-subtable">
                      <tr><td class="v-label">B.P.</td><td class="v-val">${patient.emergencyBp || ''}</td></tr>
                      <tr><td class="v-label">PULSE</td><td class="v-val">${patient.emergencyPulse || ''}</td></tr>
                      <tr><td class="v-label">SPo2</td><td class="v-val">${patient.emergencySpo2 || ''}</td></tr>
                      <tr><td class="v-label">TEM"</td><td class="v-val">${patient.emergencyTemp || ''}</td></tr>
                      <tr><td class="v-label">R.R.</td><td class="v-val">${patient.emergencyRr || ''}</td></tr>
                    </table>
                    <div style="margin-top: 4px; font-weight: 800; font-size: 10.5px; text-decoration: underline; color: #1e3a8a;">INVESTIGATIONS :</div>
                    <div class="cell-content">${patient.emergencyInvestigations || ''}</div>
                  </td>
                  <td style="vertical-align: top; padding: 6px;">
                    <div class="cell-content">${patient.emergencyDoctorsNote || ''}</div>
                  </td>
                  <td style="vertical-align: top; padding: 6px;">
                    <div class="cell-content">${patient.emergencyStateInjection || ''}</div>
                  </td>
                </tr>
              </tbody>
            </table>

            <div class="form-row" style="margin-top: 4px;">
              <span class="field-label">NOTE :-</span>
              <span class="field-value">${patient.emergencyNote || ''}</span>
            </div>
          </div>

          <div class="sign-section">
            <div class="sign-row">
              <div class="sign-cell">Dr. INCHARGE SIGN</div>
              <div class="sign-cell">MEDICAL OFFICER SIGN</div>
              <div class="sign-cell">PATIENT / RELATIVE SIGN</div>
            </div>
          </div>
        </div>

        <script>
          var printed = false;
          function doPrint() {
            if (printed) return;
            printed = true;
            window.focus();
            window.print();
          }
          if (document.readyState === 'complete') {
            setTimeout(doPrint, 200);
          } else {
            window.addEventListener('load', function() {
              setTimeout(doPrint, 200);
            });
            setTimeout(doPrint, 800);
          }
        </script>
      </body>
    </html>
  `;
  printWindow.document.open();
  printWindow.document.write(content);
  printWindow.document.close();
};

export function ConsentFormDialog({
  patient,
  settings,
  onClose,
  isReprint = false,
}: {
  patient: Patient;
  settings: any;
  onClose: () => void;
  isReprint?: boolean;
}) {
  const [signed, setSigned] = useState(false);

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
    const logoUrl = settings?.logoUrl && settings.logoUrl !== '/logo.png' && settings.logoUrl !== '/logo.jpg' ? settings.logoUrl : '/lifecare-logo.jpg';
    const helplineNumber = settings?.helpline || '7016124362';
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
              width: 85%;
              max-width: 720px;
              object-fit: contain;
              transform: rotate(-35deg);
              -webkit-transform: rotate(-35deg);
            }
            .top-section, .page-padding {
              position: relative;
              z-index: 1;
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
          <div class="watermark">
            <img src="${logoUrl}" alt="Watermark" onerror="this.src='/lifecare-logo.jpg'" />
          </div>
          <div class="top-section">
            <div class="logo-container">
              <img src="${logoUrl}" alt="Hospital Logo" onerror="this.src='/lifecare-logo.jpg'" />
            </div>
            <div class="helpline-circle">
              <span class="helpline-title">Help Line :</span>
              <span class="helpline-number">${helplineNumber}</span>
            </div>
          </div>
          
          <div class="page-padding">
          <div class="title">HOSPITAL CONSENT FORM</div>
          
          <div class="date-row">DATE / TIME :- <span>${new Date().toLocaleString()}</span></div>
          
          <div class="info-row">PATIENT FULL NAME:- <span>${patient.name}</span></div>
          <div class="info-row">AGE / GENDER - <span>${patient.age} / ${patient.gender}</span> MARITIAL STATUS - <span>${patient.maritalStatus || ""}</span> CHILD - <span>${patient.child || ""}</span></div>
          <div class="info-row">OCCUPATION - <span>${patient.occupation || ""}</span> RELIGION- <span>${patient.religion || ""}</span> CAST- <span>${patient.caste || ""}</span></div>
          <div class="info-row">CITY- <span>${patient.city || ""}</span> STATE- <span>${patient.state || ""}</span> PIN NO :- <span>${patient.pincode || ""}</span></div>
          <div class="info-row">(1) MO NO ,:- <span>${patient.phone}</span> (2) MO NO.:- <span></span></div>
          <div class="info-row">CURRENTLY WITH RELATIVE NAME :- <span>${patient.relativeName || ''}</span></div>
          <div class="info-row">RELATION :- <span>${patient.relation || ''}</span> MO NO OF RELATIVE :- <span>${patient.relativePhone || ''}</span></div>
          <div class="info-row">WARD :- <span>${patient.ward || ''}</span> WARD NO :- <span>${patient.wardNumber || ''}</span></div>
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
          
          <div class="watermark">
            <img src="${logoUrl}" alt="Watermark" onerror="this.src='/lifecare-logo.jpg'" />
          </div>
          <div class="top-section">
            <div class="logo-container">
              <img src="${logoUrl}" alt="Hospital Logo" onerror="this.src='/lifecare-logo.jpg'" />
            </div>
            <div class="helpline-circle">
              <span class="helpline-title">Help Line :</span>
              <span class="helpline-number">${helplineNumber}</span>
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
  };

  return (
    <Dialog open={true} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileCheck className="h-6 w-6 text-primary" />
            {isReprint ? "Print Consent Form" : "Hospital Consent Form"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {isReprint
              ? "Click the print button below to print a copy of the consent form for this patient."
              : "Please review and confirm all clauses before admitting the patient."}
          </p>
        </DialogHeader>

        {!isReprint && (
          <div className="space-y-3 py-4 border-y my-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-3 bg-muted/50 p-4 rounded-lg border border-border mt-4">
              <Checkbox
                id="signed-consent"
                checked={signed}
                onCheckedChange={(v) => setSigned(!!v)}
              />
              <Label
                htmlFor="signed-consent"
                className="leading-snug cursor-pointer flex-1 font-semibold text-foreground"
              >
                The patient has signed the physical consent form.
              </Label>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mt-2 flex-wrap gap-2">
          {!isReprint && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={printConsent}>
                <Printer className="h-4 w-4 mr-2" /> Print Consent Form
              </Button>
              {patient.isEmergency && (
                <Button variant="outline" className="border-rose-500 text-rose-600 hover:bg-rose-50" onClick={() => handlePrintEmergency(patient, settings)}>
                  <Printer className="h-4 w-4 mr-2" /> Print Emergency Form
                </Button>
              )}
              {patient.isMlc && (
                <Button variant="outline" onClick={() => handlePrintMlc(patient, settings)}>
                  <Printer className="h-4 w-4 mr-2" /> Print MLC
                </Button>
              )}
            </div>
          )}
          {isReprint && (
            <div className="flex gap-2">
              {patient.isEmergency && (
                <Button variant="outline" className="border-rose-500 text-rose-600 hover:bg-rose-50" onClick={() => handlePrintEmergency(patient, settings)}>
                  <Printer className="h-4 w-4 mr-2" /> Print Emergency Form
                </Button>
              )}
              {patient.isMlc && (
                <Button variant="outline" onClick={() => handlePrintMlc(patient, settings)}>
                  <Printer className="h-4 w-4 mr-2" /> Print MLC
                </Button>
              )}
            </div>
          )}
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <Button variant="ghost" onClick={onClose}>
              {isReprint ? "Cancel" : "Cancel"}
            </Button>
            {isReprint ? (
              <Button onClick={printConsent} className="gap-2">
                <Printer className="h-4 w-4" />
                Print Consent Form
              </Button>
            ) : (
              <Button onClick={onClose} disabled={!signed} className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Confirm & Admit
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
