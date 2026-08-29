import { store, uid, type Employee } from "@/lib/store";
import { apiService, type EmployeeBackendDto } from "@/api/apiService";

const mapBackendEmployee = (e: EmployeeBackendDto): Employee => ({
  id: e.id.toString(),
  code: e.code,
  name: e.name,
  email: e.email,
  password: e.password,
  phone: e.phone,
  department: e.department,
  role: e.role as Employee["role"],
  joiningDate: e.joiningDate,
  address: e.address,
  photo: e.photo,
  active: e.active,
});

export const employeeService = {
  list: async (): Promise<Employee[]> => {
    try {
      const data = await apiService.employees.getAll();
      const mapped = data.map(mapBackendEmployee);
      store.set((db) => {
        db.employees = mapped;
      });
      return mapped;
    } catch (err) {
      console.error("Failed to list employees from backend, falling back to local store:", err);
      return store.get().employees;
    }
  },
  create: async (data: Omit<Employee, "id" | "code">): Promise<Employee> => {
    try {
      const created = await apiService.employees.create({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone,
        department: data.department,
        role: data.role,
        joiningDate: data.joiningDate,
        address: data.address,
        photo: data.photo,
        active: data.active,
      });
      const mapped = mapBackendEmployee(created);
      store.set((db) => {
        db.employees.push(mapped);
      });
      return mapped;
    } catch (err) {
      console.error("Failed to create employee on backend, falling back to local store:", err);
      let createdLocal!: Employee;
      store.set((db) => {
        db.seq.employee += 1;
        createdLocal = { ...data, id: uid(), code: `EMP-${String(db.seq.employee).padStart(4, "0")}` };
        db.employees.push(createdLocal);
      });
      return createdLocal;
    }
  },
  update: async (id: string, data: Partial<Employee>) => {
    try {
      const numId = parseInt(id, 10);
      if (!isNaN(numId)) {
        const current = store.get().employees.find((x) => x.id === id);
        if (current) {
          const updated = await apiService.employees.update(numId, {
            name: data.name ?? current.name,
            email: data.email ?? current.email,
            phone: data.phone ?? current.phone,
            department: data.department ?? current.department,
            role: data.role ?? current.role,
            joiningDate: data.joiningDate ?? current.joiningDate,
            address: data.address ?? current.address,
            photo: data.photo ?? current.photo,
            active: data.active ?? current.active,
          });
          store.set((db) => {
            const i = db.employees.findIndex((e) => e.id === id);
            if (i >= 0) db.employees[i] = mapBackendEmployee(updated);
          });
          return;
        }
      }
      throw new Error("Invalid ID or employee not found locally");
    } catch (err) {
      console.error("Failed to update employee on backend, falling back to local store:", err);
      store.set((db) => {
        const i = db.employees.findIndex((e) => e.id === id);
        if (i >= 0) db.employees[i] = { ...db.employees[i], ...data };
      });
    }
  },
  remove: async (id: string) => {
    try {
      const numId = parseInt(id, 10);
      if (!isNaN(numId)) {
        await apiService.employees.delete(numId);
      }
      store.set((db) => {
        db.employees = db.employees.filter((e) => e.id !== id);
      });
    } catch (err) {
      console.error("Failed to remove employee from backend:", err);
      store.set((db) => {
        db.employees = db.employees.filter((e) => e.id !== id);
      });
    }
  },
  toggle: async (id: string) => {
    try {
      const numId = parseInt(id, 10);
      if (!isNaN(numId)) {
        const updated = await apiService.employees.toggle(numId);
        store.set((db) => {
          const e = db.employees.find((x) => x.id === id);
          if (e) e.active = updated.active;
        });
        return;
      }
      throw new Error("Invalid ID");
    } catch (err) {
      console.error("Failed to toggle employee status on backend:", err);
      store.set((db) => {
        const e = db.employees.find((x) => x.id === id);
        if (e) e.active = !e.active;
      });
    }
  },
};
