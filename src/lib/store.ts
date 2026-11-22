// Local mock database backed by localStorage. Replace with ASP.NET API calls later.
export type Role = "Admin" | "Doctor" | "Nurse" | "Receptionist" | "Pharmacist";

export interface Employee {
  id: string;
  code: string;
  name: string;
  email: string;
  password: string;
  phone: string;
  department: string;
  role: Role;
  joiningDate: string;
  address: string;
  photo?: string;
  active: boolean;
}

export interface Department { id: string; name: string; }
export interface Charge { id: string; name: string; amount: number; category?: string; }
export interface MedicineCategory { id: string; name: string; unit: string; piecesPerUnit?: number; }
export interface IpdWard { id: string; name: string; pricePerDay: number; }

export interface HospitalSettings {
  helpline: string;
  address: string;
  logoUrl: string;
  followUpValidityMonths: number;
  bankAccountName: string;
  bankAccountNumber: string;
  bankName: string;
  bankIfscCode: string;
}

export interface PastOperation { type: string; bodyPart: string; place: string; deformity: string; }

export interface Patient {
  id: string;
  code: string;
  name: string;
  phone: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  weight?: number;
  height?: number;
  caste?: string;
  addressLine: string;
  state: string;
  city: string;
  pincode: string;
  type: "OPD" | "IPD";
  department: string;
  doctor: string;
  opdCharge: number;
  registeredAt: string;
  status: "Waiting" | "In Consultation" | "Completed";
  // IPD
  allergy?: string;
  deformity?: string;
  complaint?: string;
  mediclaim?: boolean;
  insuranceCompany?: string;
  policyNumber?: string;
  pastOperations?: PastOperation[];
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

  isMlc?: boolean;
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
  mlcReportedPoliceStation?: string;
  mlcPoliceInspectorName?: string;
  mlcPoliceStationAddress?: string;
  mlcFirOrCcNumber?: string;

  isEmergency?: boolean;
  emergencyMedicalOfficer?: string;
  emergencyCondition?: string;
  emergencyPastHistory?: string;
  emergencyInvestigations?: string;
  emergencyDoctorsNote?: string;
  emergencyStateInjection?: string;
  emergencyNote?: string;

  isSurgery?: boolean;
  surgeryType?: string;
  surgeryRiskNote?: string;
  surgeryPreOpStatus?: string;
  surgeryPostOpStatus?: string;
  surgeryPastHistory?: string;

  isIcu?: boolean;
}

export interface PrescribedMedicine {
  medicineId: string;
  name: string;
  morning: string;
  afternoon: string;
  evening: string;
  night: string;
}
export interface Prescription {
  id: string;
  patientId: string;
  diagnosis: string;
  disease: string;
  medicines: PrescribedMedicine[];
  suggestion: string;
  followUpDate?: string;
  courseDays?: number;
  createdAt: string;
}

export interface Medicine {
  id: string;
  name: string;
  categoryId: string;
  mfgDate: string;
  expDate: string;
  quantity: number; // in the unit
  mrp: number;
  batch: string;
}

export interface BillItem {
  medicineId: string;
  name: string;
  units: number; // fractional strips
  pieces: number;
  mrp: number;
  total: number;
}
export interface Bill {
  id: string;
  patientId: string;
  patientCode: string;
  items: BillItem[];
  subtotal: number;
  discountType: "flat" | "percent";
  discountValue: number;
  total: number;
  createdAt: string;
}

interface DB {
  employees: Employee[];
  departments: Department[];
  charges: Charge[];
  categories: MedicineCategory[];
  ipdWards: IpdWard[];
  patients: Patient[];
  prescriptions: Prescription[];
  medicines: Medicine[];
  bills: Bill[];
  seq: { employee: number; patient: number };
  hospitalSettings: HospitalSettings;
}

const KEY = "hms.db.v1";

const seed = (): DB => ({
  employees: [],
  departments: [],
  charges: [],
  categories: [],
  ipdWards: [],
  patients: [],
  prescriptions: [],
  medicines: [],
  bills: [],
  seq: { employee: 0, patient: 0 },
  hospitalSettings: { 
    helpline: "93 74 108 108 / 8000 8111", 
    address: "Vijardiya", 
    logoUrl: "/lifecare-logo.jpg", 
    followUpValidityMonths: 3,
    bankAccountName: "",
    bankAccountNumber: "",
    bankName: "",
    bankIfscCode: ""
  },
});

let cache: DB | null = null;

function load(): DB {
  if (cache) return cache;
  if (typeof window === "undefined") {
    cache = seed();
    return cache;
  }
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      cache = seed();
      localStorage.setItem(KEY, JSON.stringify(cache));
      return cache;
    }
    cache = JSON.parse(raw) as DB;
    if (!cache.hospitalSettings) {
      cache.hospitalSettings = { 
        helpline: "93 74 108 108 / 8000 8111", 
        address: "Vijardiya", 
        logoUrl: "/lifecare-logo.jpg",
        followUpValidityMonths: 3,
        bankAccountName: "",
        bankAccountNumber: "",
        bankName: "",
        bankIfscCode: ""
      };
    } else if (!cache.hospitalSettings.logoUrl || cache.hospitalSettings.logoUrl === "/logo.png" || cache.hospitalSettings.logoUrl === "/logo.jpg") {
      cache.hospitalSettings.logoUrl = "/lifecare-logo.jpg";
    }
    if (!cache.ipdWards) {
      cache.ipdWards = seed().ipdWards;
    }
    return cache;
  } catch {
    cache = seed();
    return cache;
  }
}

function save(db: DB) {
  cache = db;
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(db));
}

const listeners = new Set<() => void>();

export const store = {
  get: (): DB => load(),
  set: (updater: (db: DB) => DB | void) => {
    const db = load();
    const next = (updater(db) || db) as DB;
    save({ ...next });
    listeners.forEach((l) => l());
  },
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  reset: () => {
    cache = null;
    if (typeof window !== "undefined") localStorage.removeItem(KEY);
    listeners.forEach((l) => l());
  },
};

export const uid = () => Math.random().toString(36).slice(2, 10);
