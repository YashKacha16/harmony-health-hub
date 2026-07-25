import { store, uid, type Patient } from "@/lib/store";

export const receptionService = {
  list: async (): Promise<Patient[]> => store.get().patients,
  get: async (id: string) => store.get().patients.find((p) => p.id === id) || null,
  findByCode: async (code: string) =>
    store.get().patients.find((p) => p.code.toLowerCase() === code.toLowerCase()) || null,
  create: async (data: Omit<Patient, "id" | "code" | "registeredAt" | "status">) => {
    let created!: Patient;
    store.set((db) => {
      db.seq.patient += 1;
      created = {
        ...data,
        id: uid(),
        code: `P-${new Date().getFullYear()}-${String(db.seq.patient).padStart(5, "0")}`,
        registeredAt: new Date().toISOString(),
        status: "Waiting",
      };
      db.patients.push(created);
    });
    return created;
  },
  updateStatus: async (id: string, status: Patient["status"]) => {
    store.set((db) => { const p = db.patients.find((x) => x.id === id); if (p) p.status = status; });
  },
};
