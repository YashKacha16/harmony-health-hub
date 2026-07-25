import { store, uid, type Medicine, type Bill } from "@/lib/store";

export const medicalService = {
  listMedicines: async (): Promise<Medicine[]> => store.get().medicines,
  addMedicine: async (data: Omit<Medicine, "id">) => {
    store.set((db) => { db.medicines.push({ id: uid(), ...data }); });
  },
  updateMedicine: async (id: string, data: Partial<Medicine>) => {
    store.set((db) => { const m = db.medicines.find((x) => x.id === id); if (m) Object.assign(m, data); });
  },
  removeMedicine: async (id: string) => {
    store.set((db) => { db.medicines = db.medicines.filter((m) => m.id !== id); });
  },
  listBills: async () => store.get().bills,
  createBill: async (data: Omit<Bill, "id" | "createdAt">) => {
    let created!: Bill;
    store.set((db) => {
      created = { ...data, id: uid(), createdAt: new Date().toISOString() };
      db.bills.push(created);
      // decrement stock by units (fractional strips)
      for (const item of data.items) {
        const m = db.medicines.find((x) => x.id === item.medicineId);
        if (m) m.quantity = Math.max(0, m.quantity - item.units);
      }
    });
    return created;
  },
};
