import { store, uid, type Employee } from "@/lib/store";

// Swap these implementations with axios/fetch to your ASP.NET endpoints later.
export const employeeService = {
  list: async (): Promise<Employee[]> => store.get().employees,
  create: async (data: Omit<Employee, "id" | "code">) => {
    let created!: Employee;
    store.set((db) => {
      db.seq.employee += 1;
      created = { ...data, id: uid(), code: `EMP-${String(db.seq.employee).padStart(4, "0")}` };
      db.employees.push(created);
    });
    return created;
  },
  update: async (id: string, data: Partial<Employee>) => {
    store.set((db) => {
      const i = db.employees.findIndex((e) => e.id === id);
      if (i >= 0) db.employees[i] = { ...db.employees[i], ...data };
    });
  },
  remove: async (id: string) => {
    store.set((db) => { db.employees = db.employees.filter((e) => e.id !== id); });
  },
  toggle: async (id: string) => {
    store.set((db) => {
      const e = db.employees.find((x) => x.id === id);
      if (e) e.active = !e.active;
    });
  },
};
