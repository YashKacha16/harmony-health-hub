import { store, uid, type Department, type Charge, type MedicineCategory } from "@/lib/store";

export const settingsService = {
  // Departments
  listDepartments: async (): Promise<Department[]> => store.get().departments,
  addDepartment: async (name: string) => {
    store.set((db) => { db.departments.push({ id: uid(), name }); });
  },
  updateDepartment: async (id: string, name: string) => {
    store.set((db) => { const d = db.departments.find((x) => x.id === id); if (d) d.name = name; });
  },
  removeDepartment: async (id: string) => {
    store.set((db) => { db.departments = db.departments.filter((d) => d.id !== id); });
  },

  // Charges
  listCharges: async (): Promise<Charge[]> => store.get().charges,
  addCharge: async (name: string, amount: number) => {
    store.set((db) => { db.charges.push({ id: uid(), name, amount }); });
  },
  updateCharge: async (id: string, data: Partial<Charge>) => {
    store.set((db) => { const c = db.charges.find((x) => x.id === id); if (c) Object.assign(c, data); });
  },
  removeCharge: async (id: string) => {
    store.set((db) => { db.charges = db.charges.filter((c) => c.id !== id); });
  },

  // Medicine Categories
  listCategories: async (): Promise<MedicineCategory[]> => store.get().categories,
  addCategory: async (data: Omit<MedicineCategory, "id">) => {
    store.set((db) => { db.categories.push({ id: uid(), ...data }); });
  },
  updateCategory: async (id: string, data: Partial<MedicineCategory>) => {
    store.set((db) => { const c = db.categories.find((x) => x.id === id); if (c) Object.assign(c, data); });
  },
  removeCategory: async (id: string) => {
    store.set((db) => { db.categories = db.categories.filter((c) => c.id !== id); });
  },
};
