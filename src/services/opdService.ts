import { store, uid, type Prescription } from "@/lib/store";

export const opdService = {
  listPrescriptions: async () => store.get().prescriptions,
  getForPatient: async (patientId: string) =>
    store.get().prescriptions.filter((p) => p.patientId === patientId),
  latestForPatient: async (patientId: string) => {
    const all = store.get().prescriptions.filter((p) => p.patientId === patientId);
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;
  },
  create: async (data: Omit<Prescription, "id" | "createdAt">) => {
    let created!: Prescription;
    store.set((db) => {
      created = { ...data, id: uid(), createdAt: new Date().toISOString() };
      db.prescriptions.push(created);
      const patient = db.patients.find((p) => p.id === data.patientId);
      if (patient) patient.status = "Completed";
    });
    return created;
  },
};
