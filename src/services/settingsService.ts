import { store, uid, type Department, type Charge, type MedicineCategory } from "@/lib/store";
import { apiService } from "@/api/apiService";

export const settingsService = {
  // Departments
  listDepartments: async (): Promise<Department[]> => {
    try {
      const data = await apiService.departments.getAll();
      const mapped = data.map((d) => ({ id: d.id.toString(), name: d.name }));
      store.set((db) => {
        db.departments = mapped;
      });
      return mapped;
    } catch (err) {
      console.error("Failed to list departments from backend, falling back to local store:", err);
      return store.get().departments;
    }
  },
  addDepartment: async (name: string) => {
    try {
      const newDept = await apiService.departments.create({ name });
      store.set((db) => {
        db.departments.push({ id: newDept.id.toString(), name: newDept.name });
      });
    } catch (err) {
      console.error("Failed to add department to backend, updating local store only:", err);
      store.set((db) => {
        db.departments.push({ id: uid(), name });
      });
    }
  },
  updateDepartment: async (id: string, name: string) => {
    try {
      const numId = parseInt(id, 10);
      if (!isNaN(numId)) {
        await apiService.departments.update(numId, { name });
      }
      store.set((db) => {
        const d = db.departments.find((x) => x.id === id);
        if (d) d.name = name;
      });
    } catch (err) {
      console.error("Failed to update department on backend:", err);
      store.set((db) => {
        const d = db.departments.find((x) => x.id === id);
        if (d) d.name = name;
      });
    }
  },
  removeDepartment: async (id: string) => {
    try {
      const numId = parseInt(id, 10);
      if (!isNaN(numId)) {
        await apiService.departments.delete(numId);
      }
      store.set((db) => {
        db.departments = db.departments.filter((d) => d.id !== id);
      });
    } catch (err) {
      console.error("Failed to remove department from backend:", err);
      store.set((db) => {
        db.departments = db.departments.filter((d) => d.id !== id);
      });
    }
  },

  // Charges
  listCharges: async (): Promise<Charge[]> => {
    try {
      const data = await apiService.charges.getAll();
      const mapped = data.map((c) => ({ id: c.id.toString(), name: c.name, amount: c.amount, category: c.category }));
      store.set((db) => {
        db.charges = mapped;
      });
      return mapped;
    } catch (err) {
      console.error("Failed to list charges from backend, falling back to local store:", err);
      return store.get().charges;
    }
  },
  addCharge: async (name: string, amount: number, category: string = "Hospital Bill") => {
    try {
      const newCharge = await apiService.charges.create({ name, amount, category });
      store.set((db) => {
        db.charges.push({ id: newCharge.id.toString(), name: newCharge.name, amount: newCharge.amount, category: newCharge.category });
      });
    } catch (err) {
      console.error("Failed to add charge to backend, updating local store only:", err);
      store.set((db) => { db.charges.push({ id: uid(), name, amount, category }); });
    }
  },
  updateCharge: async (id: string, data: Partial<Charge>) => {
    try {
      const numId = parseInt(id, 10);
      if (!isNaN(numId)) {
        await apiService.charges.update(numId, { name: data.name, amount: data.amount, category: data.category });
      }
      store.set((db) => { const c = db.charges.find((x) => x.id === id); if (c) Object.assign(c, data); });
    } catch (err) {
      console.error("Failed to update charge on backend:", err);
      store.set((db) => { const c = db.charges.find((x) => x.id === id); if (c) Object.assign(c, data); });
    }
  },
  removeCharge: async (id: string) => {
    try {
      const numId = parseInt(id, 10);
      if (!isNaN(numId)) {
        await apiService.charges.delete(numId);
      }
      store.set((db) => { db.charges = db.charges.filter((c) => c.id !== id); });
    } catch (err) {
      console.error("Failed to remove charge from backend:", err);
      store.set((db) => { db.charges = db.charges.filter((c) => c.id !== id); });
    }
  },

  // Medicine Categories
  listCategories: async (): Promise<MedicineCategory[]> => {
    try {
      const data = await apiService.medicineCategories.getAll();
      const mapped = data.map((c) => ({ id: c.id.toString(), name: c.name, unit: c.unit, piecesPerUnit: c.piecesPerUnit }));
      store.set((db) => {
        db.categories = mapped;
      });
      return mapped;
    } catch (err) {
      console.error("Failed to list categories from backend, falling back to local store:", err);
      return store.get().categories;
    }
  },
  addCategory: async (data: Omit<MedicineCategory, "id">) => {
    try {
      const newCategory = await apiService.medicineCategories.create({
        name: data.name,
        unit: data.unit,
        piecesPerUnit: data.piecesPerUnit ?? 1
      });
      store.set((db) => {
        db.categories.push({ id: newCategory.id.toString(), name: newCategory.name, unit: newCategory.unit, piecesPerUnit: newCategory.piecesPerUnit });
      });
    } catch (err) {
      console.error("Failed to add category to backend, updating local store only:", err);
      store.set((db) => { db.categories.push({ id: uid(), ...data }); });
    }
  },
  updateCategory: async (id: string, data: Partial<MedicineCategory>) => {
    try {
      const numId = parseInt(id, 10);
      if (!isNaN(numId)) {
        await apiService.medicineCategories.update(numId, data);
      }
      store.set((db) => { const c = db.categories.find((x) => x.id === id); if (c) Object.assign(c, data); });
    } catch (err) {
      console.error("Failed to update category on backend:", err);
      store.set((db) => { const c = db.categories.find((x) => x.id === id); if (c) Object.assign(c, data); });
    }
  },
  removeCategory: async (id: string) => {
    try {
      const numId = parseInt(id, 10);
      if (!isNaN(numId)) {
        await apiService.medicineCategories.delete(numId);
      }
      store.set((db) => { db.categories = db.categories.filter((c) => c.id !== id); });
    } catch (err) {
      console.error("Failed to remove category from backend:", err);
      store.set((db) => { db.categories = db.categories.filter((c) => c.id !== id); });
    }
  },

  // IPD Wards
  listIpdWards: async (): Promise<{ id: string; name: string; pricePerDay: number }[]> => {
    try {
      const data = await apiService.ipdWards.getAll();
      const mapped = data.map((w) => ({ id: w.id.toString(), name: w.name, pricePerDay: w.pricePerDay }));
      store.set((db) => {
        db.ipdWards = mapped;
      });
      return mapped;
    } catch (err) {
      console.error("Failed to list IPD wards from backend, falling back to local store:", err);
      return store.get().ipdWards;
    }
  },
  addIpdWard: async (name: string, pricePerDay: number) => {
    try {
      const newWard = await apiService.ipdWards.create({ name, pricePerDay });
      store.set((db) => {
        db.ipdWards.push({ id: newWard.id.toString(), name: newWard.name, pricePerDay: newWard.pricePerDay });
      });
    } catch (err) {
      console.error("Failed to add ward to backend, updating local store only:", err);
      store.set((db) => { db.ipdWards.push({ id: uid(), name, pricePerDay }); });
    }
  },
  updateIpdWard: async (id: string, data: Partial<{ name: string; pricePerDay: number }>) => {
    try {
      const numId = parseInt(id, 10);
      if (!isNaN(numId)) {
        await apiService.ipdWards.update(numId, data);
      }
      store.set((db) => { const w = db.ipdWards.find((x) => x.id === id); if (w) Object.assign(w, data); });
    } catch (err) {
      console.error("Failed to update ward on backend:", err);
      store.set((db) => { const w = db.ipdWards.find((x) => x.id === id); if (w) Object.assign(w, data); });
    }
  },
  removeIpdWard: async (id: string) => {
    try {
      const numId = parseInt(id, 10);
      if (!isNaN(numId)) {
        await apiService.ipdWards.delete(numId);
      }
      store.set((db) => { db.ipdWards = db.ipdWards.filter((w) => w.id !== id); });
    } catch (err) {
      console.error("Failed to remove ward from backend:", err);
      store.set((db) => { db.ipdWards = db.ipdWards.filter((w) => w.id !== id); });
    }
  },

  // Hospital Settings
  getHospitalSettings: async () => {
    try {
      const data = await apiService.hospitalSettings.get();
      const mapped = {
        helpline: data.helpline || "",
        address: data.address || "",
        logoUrl: data.logoUrl || "/lifecare-logo.jpg",
        followUpValidityMonths: data.followUpValidityMonths ?? 3,
        bankAccountName: data.bankAccountName || "",
        bankAccountNumber: data.bankAccountNumber || "",
        bankName: data.bankName || "",
        bankIfscCode: data.bankIfscCode || ""
      };
      store.set((db) => {
        db.hospitalSettings = mapped;
      });
      return mapped;
    } catch (err) {
      console.error("Failed to fetch hospital settings from backend, falling back to local store:", err);
      return store.get().hospitalSettings;
    }
  },
  updateHospitalSettings: async (data: Partial<{ 
    helpline: string; 
    address: string; 
    logoUrl: string; 
    followUpValidityMonths: number;
    bankAccountName: string;
    bankAccountNumber: string;
    bankName: string;
    bankIfscCode: string;
  }>) => {
    try {
      const current = store.get().hospitalSettings || {
        helpline: "",
        address: "",
        logoUrl: "/lifecare-logo.jpg",
        followUpValidityMonths: 3,
        bankAccountName: "",
        bankAccountNumber: "",
        bankName: "",
        bankIfscCode: ""
      };
      const merged = { ...current, ...data };
      await apiService.hospitalSettings.update({
        helpline: merged.helpline,
        address: merged.address,
        logoUrl: merged.logoUrl || "/lifecare-logo.jpg",
        followUpValidityMonths: Number(merged.followUpValidityMonths) || 3,
        bankAccountName: merged.bankAccountName,
        bankAccountNumber: merged.bankAccountNumber,
        bankName: merged.bankName,
        bankIfscCode: merged.bankIfscCode
      });
      store.set((db) => {
        db.hospitalSettings = merged;
      });
    } catch (err) {
      console.error("Failed to update hospital settings on backend, updating local store only:", err);
      store.set((db) => {
        db.hospitalSettings = { ...db.hospitalSettings, ...data };
      });
    }
  },
  uploadLogo: async (file: File) => {
    try {
      const res = await apiService.hospitalSettings.uploadLogo(file);
      // Keep URL or fallback to default dist logo
      const url = res.logoUrl || "/lifecare-logo.jpg";
      store.set((db) => {
        if (db.hospitalSettings) {
          db.hospitalSettings.logoUrl = url;
        }
      });
      return url;
    } catch (error) {
      console.error("Failed to upload logo", error);
      throw error;
    }
  }
};
