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
export interface Charge { id: string; name: string; amount: number; }
export interface MedicineCategory { id: string; name: string; unit: string; piecesPerUnit?: number; }

export interface HospitalSettings {
  helpline: string;
  address: string;
  logoUrl: string;
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
  patients: Patient[];
  prescriptions: Prescription[];
  medicines: Medicine[];
  bills: Bill[];
  seq: { employee: number; patient: number };
  hospitalSettings: HospitalSettings;
}

const KEY = "hms.db.v1";

const seed = (): DB => ({
  employees: [
    { id: "e1", code: "EMP-0001", name: "Dr. Aisha Khan", email: "aisha@hms.local", password: "admin123", phone: "9876543210", department: "General Medicine", role: "Admin", joiningDate: "2023-01-10", address: "12 Park Ave", active: true },
    { id: "e2", code: "EMP-0002", name: "Dr. Ravi Patel", email: "ravi@hms.local", password: "doctor123", phone: "9876500002", department: "Cardiology", role: "Doctor", joiningDate: "2023-04-01", address: "22 Lake Rd", active: true },
    { id: "e3", code: "EMP-0003", name: "Priya Nair", email: "priya@hms.local", password: "recep123", phone: "9876500003", department: "Reception", role: "Receptionist", joiningDate: "2024-02-15", address: "5 Rose St", active: true },
    { id: "e4", code: "EMP-0004", name: "Sanjay Verma", email: "sanjay@hms.local", password: "pharm123", phone: "9876500004", department: "Pharmacy", role: "Pharmacist", joiningDate: "2024-05-20", address: "9 Elm St", active: true },
  ],
  departments: [
    { id: "d1", name: "General Medicine" },
    { id: "d2", name: "Cardiology" },
    { id: "d3", name: "Pediatrics" },
    { id: "d4", name: "Orthopedics" },
    { id: "d5", name: "Reception" },
    { id: "d6", name: "Pharmacy" },
  ],
  charges: [
    { id: "c1", name: "OPD Charge", amount: 300 },
    { id: "c2", name: "Registration Charge", amount: 100 },
    { id: "c3", name: "IPD Admission Charge", amount: 2500 },
  ],
  categories: [
    { id: "cat1", name: "Tablet", unit: "Strip", piecesPerUnit: 10 },
    { id: "cat2", name: "Syrup", unit: "Bottle", piecesPerUnit: 1 },
    { id: "cat3", name: "Injection", unit: "Piece", piecesPerUnit: 1 },
    { id: "cat4", name: "Capsule", unit: "Strip", piecesPerUnit: 10 },
  ],
  patients: [],
  prescriptions: [],
  medicines: [
    { id: "m1", name: "Paracetamol 500mg", categoryId: "cat1", mfgDate: "2025-01-01", expDate: "2027-01-01", quantity: 50, mrp: 25, batch: "PC-A21" },
    { id: "m2", name: "Amoxicillin 250mg", categoryId: "cat4", mfgDate: "2024-06-01", expDate: "2026-06-01", quantity: 30, mrp: 60, batch: "AM-B12" },
    { id: "m3", name: "Cough Syrup", categoryId: "cat2", mfgDate: "2025-02-01", expDate: "2026-08-01", quantity: 15, mrp: 90, batch: "CS-42" },
    { id: "m4", name: "Insulin Injection", categoryId: "cat3", mfgDate: "2025-03-01", expDate: "2026-03-01", quantity: 8, mrp: 250, batch: "IN-77" },
  ],
  bills: [],
  seq: { employee: 4, patient: 0 },
  hospitalSettings: { helpline: "93 74 108 108 / 8000 8111", address: "Vijardiya", logoUrl: "" },
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
        logoUrl: "/logo.png" 
      };
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
