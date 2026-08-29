import { store } from "../lib/store";
import type { Patient } from "../lib/store";
import { apiService } from "../api/apiService";
import type { PatientBackendDto } from "../api/apiService";

function mapPatient(p: PatientBackendDto): Patient {
  return {
    id: p.id.toString(),
    code: p.code,
    name: p.name,
    phone: p.phone,
    age: p.age,
    gender: p.gender as "Male" | "Female" | "Other",
    weight: p.weight,
    height: p.height,
    caste: p.caste,
    addressLine: p.addressLine,
    state: p.state,
    city: p.city,
    pincode: p.pincode || "",
    type: p.type as "OPD" | "IPD",
    department: p.department,
    doctor: p.doctor,
    opdCharge: p.opdCharge,
    registeredAt: p.registeredAt,
    status: p.status as "Waiting" | "In Consultation" | "Completed",
    allergy: p.allergy,
    deformity: p.deformity,
    complaint: p.complaint,
    mediclaim: p.mediclaim,
    insuranceCompany: p.insuranceCompany,
    policyNumber: p.policyNumber,
    pastOperations: p.pastOperations?.map(po => ({
      type: po.type,
      bodyPart: po.bodyPart,
      place: po.place,
      deformity: po.deformity || ""
    })) || [],
    ward: p.ward,
    wardNumber: p.wardNumber,
    relativeName: p.relativeName,
    relation: p.relation,
    relativePhone: p.relativePhone,
    relativeAddress: p.relativeAddress,
    maritalStatus: p.maritalStatus,
    child: p.child,
    occupation: p.occupation,
    religion: p.religion,
  };
}

export const receptionService = {
  listPatients: async (): Promise<Patient[]> => {
    try {
      const data = await apiService.patients.getAll();
      const mapped = data.map(mapPatient);
      store.set((db) => { db.patients = mapped; });
      return mapped;
    } catch (err) {
      console.error("Failed to list patients from backend:", err);
      return store.get().patients;
    }
  },
  searchPatient: async (q: string): Promise<Patient[]> => {
    try {
      const data = await apiService.patients.search(q);
      return data.map(mapPatient);
    } catch (err) {
      console.error("Failed to search patients from backend:", err);
      // Fallback to local store search
      const query = q.toLowerCase();
      return store.get().patients.filter(p => p.code.toLowerCase().includes(query) || p.name.toLowerCase().includes(query)).slice(0, 10);
    }
  },
  findByCode: async (code: string) => {
    try {
      const data = await apiService.patients.getByCode(code);
      return mapPatient(data);
    } catch (err) {
      return store.get().patients.find((p) => p.code.toLowerCase() === code.toLowerCase());
    }
  },
  registerPatient: async (data: Omit<Patient, "id" | "code" | "registeredAt" | "status">) => {
    try {
      const payload = {
        name: data.name,
        phone: data.phone,
        age: data.age,
        gender: data.gender,
        weight: data.weight,
        height: data.height,
        caste: data.caste,
        addressLine: data.addressLine,
        state: data.state,
        city: data.city,
        pincode: data.pincode,
        type: data.type,
        department: data.department,
        doctor: data.doctor,
        opdCharge: data.opdCharge,
        allergy: data.allergy,
        deformity: data.deformity,
        complaint: data.complaint,
        mediclaim: data.mediclaim,
        insuranceCompany: data.insuranceCompany,
        policyNumber: data.policyNumber,
        pastOperations: data.pastOperations?.map((po) => ({
          type: po.type,
          bodyPart: po.bodyPart,
          place: po.place,
          deformity: po.deformity || ""
        })),
        ward: data.ward,
        wardNumber: data.wardNumber,
        relativeName: data.relativeName,
        relation: data.relation,
        relativePhone: data.relativePhone,
        relativeAddress: data.relativeAddress,
        maritalStatus: data.maritalStatus,
        child: data.child,
        occupation: data.occupation,
        religion: data.religion,
      };
      
      const newPatient = await apiService.patients.create(payload);
      const mappedPatient = mapPatient(newPatient);
      store.set((db) => {
        db.patients.push(mappedPatient);
      });
      return mappedPatient;
    } catch (err) {
      console.error("Failed to register patient in backend:", err);
      // Fallback
      let newCode = "";
      let p!: Patient;
      store.set((db) => {
        db.seq.patient += 1;
        const year = new Date().getFullYear();
        newCode = `P-${year}-${db.seq.patient.toString().padStart(5, "0")}`;
        p = {
          ...data,
          id: Math.random().toString(36).slice(2),
          code: newCode,
          status: "Waiting",
          registeredAt: new Date().toISOString(),
        };
        db.patients.push(p);
      });
      return p;
    }
  },
  updateStatus: async (id: string, status: "Waiting" | "In Consultation" | "Completed") => {
    try {
      const numId = parseInt(id, 10);
      if (!isNaN(numId)) {
        await apiService.patients.updateStatus(numId, status);
      }
      store.set((db) => { const p = db.patients.find((x) => x.id === id); if (p) p.status = status; });
    } catch (err) {
      console.error("Failed to update status in backend:", err);
      store.set((db) => { const p = db.patients.find((x) => x.id === id); if (p) p.status = status; });
    }
  },
};
