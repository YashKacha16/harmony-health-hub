import { store, uid } from "../lib/store";
import type { Bill, BillItem, Medicine } from "../lib/store";
import { apiService } from "../api/apiService";

export const medicalService = {
  listMedicines: async (): Promise<Medicine[]> => {
    try {
      const data = await apiService.medicines.getAll();
      const mapped = data.map((m) => ({
        id: m.id.toString(),
        name: m.name,
        categoryId: m.categoryId.toString(),
        batch: m.batch,
        mfgDate: m.mfgDate,
        expDate: m.expDate,
        quantity: m.quantity,
        mrp: m.mrp,
      }));
      store.set((db) => {
        db.medicines = mapped;
      });
      return mapped;
    } catch (err) {
      console.error("Failed to list medicines from backend, falling back to local store:", err);
      return store.get().medicines;
    }
  },
  searchMedicine: async (q: string): Promise<Medicine[]> => {
    try {
      const data = await apiService.medicines.search(q);
      return data.map((m) => ({
        id: m.id.toString(),
        name: m.name,
        categoryId: m.categoryId.toString(),
        batch: m.batch,
        mfgDate: m.mfgDate,
        expDate: m.expDate,
        quantity: m.quantity,
        mrp: m.mrp,
      }));
    } catch (err) {
      console.error("Failed to search medicines from backend:", err);
      const query = q.toLowerCase();
      return store.get().medicines.filter(m => m.name.toLowerCase().includes(query) || m.batch.toLowerCase().includes(query)).slice(0, 20);
    }
  },
  addMedicine: async (data: Omit<Medicine, "id">) => {
    try {
      const newMed = await apiService.medicines.create({
        name: data.name,
        categoryId: parseInt(data.categoryId, 10),
        batch: data.batch,
        mfgDate: data.mfgDate,
        expDate: data.expDate,
        quantity: data.quantity,
        mrp: data.mrp,
      });
      store.set((db) => {
        db.medicines.push({
          id: newMed.id.toString(),
          name: newMed.name,
          categoryId: newMed.categoryId.toString(),
          batch: newMed.batch,
          mfgDate: newMed.mfgDate,
          expDate: newMed.expDate,
          quantity: newMed.quantity,
          mrp: newMed.mrp,
        });
      });
    } catch (err) {
      console.error("Failed to add medicine to backend, updating local store only:", err);
      store.set((db) => { db.medicines.push({ id: uid(), ...data }); });
    }
  },
  updateMedicine: async (id: string, data: Partial<Medicine>) => {
    try {
      const numId = parseInt(id, 10);
      if (!isNaN(numId)) {
        await apiService.medicines.update(numId, {
          name: data.name,
          categoryId: data.categoryId ? parseInt(data.categoryId, 10) : undefined,
          batch: data.batch,
          mfgDate: data.mfgDate,
          expDate: data.expDate,
          quantity: data.quantity,
          mrp: data.mrp,
        });
      }
      store.set((db) => { const m = db.medicines.find((x) => x.id === id); if (m) Object.assign(m, data); });
    } catch (err) {
      console.error("Failed to update medicine on backend:", err);
      store.set((db) => { const m = db.medicines.find((x) => x.id === id); if (m) Object.assign(m, data); });
    }
  },
  removeMedicine: async (id: string) => {
    try {
      const numId = parseInt(id, 10);
      if (!isNaN(numId)) {
        await apiService.medicines.delete(numId);
      }
      store.set((db) => { db.medicines = db.medicines.filter((m) => m.id !== id); });
    } catch (err) {
      console.error("Failed to remove medicine from backend:", err);
      store.set((db) => { db.medicines = db.medicines.filter((m) => m.id !== id); });
    }
  },
  listBills: async (): Promise<Bill[]> => {
    try {
      const data = await apiService.bills.getAll();
      const mapped = data.map((b) => ({
        id: b.id.toString(),
        patientId: b.patientId,
        patientCode: b.patientCode,
        subtotal: b.subtotal,
        discountType: b.discountType,
        discountValue: b.discountValue,
        total: b.total,
        createdAt: b.createdAt,
        items: b.items.map(i => ({
          medicineId: i.medicineId,
          name: i.name,
          units: i.units,
          pieces: i.pieces,
          mrp: i.mrp,
          total: i.total
        }))
      }));
      store.set((db) => { db.bills = mapped; });
      return mapped;
    } catch (err) {
      console.error("Failed to list bills from backend:", err);
      return store.get().bills;
    }
  },
  createBill: async (data: Omit<Bill, "id" | "createdAt">) => {
    try {
      const payload = {
        patientId: data.patientId,
        patientCode: data.patientCode,
        subtotal: data.subtotal,
        discountType: data.discountType,
        discountValue: data.discountValue,
        total: data.total,
        items: data.items.map(i => ({
          medicineId: i.medicineId,
          name: i.name,
          units: i.units,
          pieces: i.pieces,
          mrp: i.mrp,
          total: i.total
        }))
      };
      
      const newBill = await apiService.bills.create(payload);
      const mapped: Bill = {
        id: newBill.id.toString(),
        patientId: newBill.patientId,
        patientCode: newBill.patientCode,
        subtotal: newBill.subtotal,
        discountType: newBill.discountType,
        discountValue: newBill.discountValue,
        total: newBill.total,
        createdAt: newBill.createdAt,
        items: newBill.items.map(i => ({
          medicineId: i.medicineId,
          name: i.name,
          units: i.units,
          pieces: i.pieces,
          mrp: i.mrp,
          total: i.total
        }))
      };
      
      store.set((db) => {
        db.bills.push(mapped);
        for (const item of data.items) {
          const m = db.medicines.find((x) => x.id === item.medicineId);
          if (m) m.quantity = Math.max(0, m.quantity - (item.pieces / (db.categories.find(c => c.id === m.categoryId)?.piecesPerUnit || 1)));
        }
      });
      return mapped;
    } catch (err) {
      console.error("Failed to create bill in backend:", err);
      // Fallback
      let created!: Bill;
      store.set((db) => {
        created = { ...data, id: uid(), createdAt: new Date().toISOString() };
        db.bills.push(created);
        for (const item of data.items) {
          const m = db.medicines.find((x) => x.id === item.medicineId);
          if (m) m.quantity = Math.max(0, m.quantity - (item.pieces / (db.categories.find(c => c.id === m.categoryId)?.piecesPerUnit || 1)));
        }
      });
      return created;
    }
  },
};
