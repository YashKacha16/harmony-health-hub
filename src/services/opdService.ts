import { store } from "../lib/store";
import type { Prescription, PrescribedMedicine } from "../lib/store";
import { apiService } from "../api/apiService";

export const opdService = {
  listPrescriptions: async (): Promise<Prescription[]> => {
    try {
      const data = await apiService.prescriptions.getAll();
      const mapped: Prescription[] = data.map((p) => ({
        id: p.id.toString(),
        patientId: p.patientId,
        diagnosis: p.diagnosis || "",
        disease: p.disease || "",
        suggestion: p.suggestion || "",
        followUpDate: p.followUpDate,
        courseDays: p.courseDays,
        createdAt: p.createdAt,
        medicines: p.medicines.map(m => ({
          medicineId: m.medicineId,
          name: m.name,
          morning: m.morning,
          afternoon: m.afternoon,
          evening: m.evening,
          night: m.night
        }))
      }));
      store.set((db) => { db.prescriptions = mapped; });
      return mapped;
    } catch (err) {
      console.error("Failed to list prescriptions:", err);
      return store.get().prescriptions;
    }
  },
  latestForPatient: async (patientId: string) => {
    const all = store.get().prescriptions.filter((p) => p.patientId === patientId);
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;
  },
  createPrescription: async (data: Omit<Prescription, "id" | "createdAt">) => {
    try {
      const payload = {
        patientId: data.patientId,
        diagnosis: data.diagnosis,
        disease: data.disease,
        suggestion: data.suggestion,
        followUpDate: data.followUpDate,
        courseDays: data.courseDays,
        medicines: data.medicines.map(m => ({
          medicineId: m.medicineId,
          name: m.name,
          morning: m.morning,
          afternoon: m.afternoon,
          evening: m.evening,
          night: m.night
        }))
      };
      
      const newPrescription = await apiService.prescriptions.create(payload);
      const mapped: Prescription = {
        id: newPrescription.id.toString(),
        patientId: newPrescription.patientId,
        diagnosis: newPrescription.diagnosis || "",
        disease: newPrescription.disease || "",
        suggestion: newPrescription.suggestion || "",
        followUpDate: newPrescription.followUpDate,
        courseDays: newPrescription.courseDays,
        createdAt: newPrescription.createdAt,
        medicines: newPrescription.medicines.map(m => ({
          medicineId: m.medicineId,
          name: m.name,
          morning: m.morning,
          afternoon: m.afternoon,
          evening: m.evening,
          night: m.night
        }))
      };
      
      store.set((db) => { 
        db.prescriptions.push(mapped); 
        const patient = db.patients.find((p) => p.id === data.patientId);
        if (patient) patient.status = "Completed";
      });
      return mapped;
    } catch (err) {
      console.error("Failed to create prescription in backend:", err);
      // Fallback
      let created!: Prescription;
      store.set((db) => {
        created = {
          ...data,
          id: Math.random().toString(36).slice(2, 10),
          createdAt: new Date().toISOString(),
        };
        db.prescriptions.push(created);
        const patient = db.patients.find((p) => p.id === data.patientId);
        if (patient) patient.status = "Completed";
      });
      return created;
    }
  },
};
