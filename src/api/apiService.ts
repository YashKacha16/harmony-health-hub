import { apiClient, BASE_URL } from "./apiClient";

export interface DepartmentBackendDto {
  id: number;
  name: string;
}

export interface CreateDepartmentPayload {
  name: string;
}

export interface ChargeBackendDto {
  id: number;
  name: string;
  amount: number;
}

export interface CreateChargePayload {
  name: string;
  amount: number;
}

export interface UpdateChargePayload {
  name?: string;
  amount?: number;
}

export interface MedicineCategoryBackendDto {
  id: number;
  name: string;
  unit: string;
  piecesPerUnit: number;
}

export interface CreateMedicineCategoryPayload {
  name: string;
  unit: string;
  piecesPerUnit: number;
}

export interface UpdateMedicineCategoryPayload {
  name?: string;
  unit?: string;
  piecesPerUnit?: number;
}

export interface MedicineBackendDto {
  id: number;
  name: string;
  categoryId: number;
  batch: string;
  mfgDate: string;
  expDate: string;
  quantity: number;
  mrp: number;
}

export interface CreateMedicinePayload {
  name: string;
  categoryId: number;
  batch?: string;
  mfgDate: string;
  expDate: string;
  quantity: number;
  mrp: number;
}

export interface UpdateMedicinePayload {
  name?: string;
  categoryId?: number;
  batch?: string;
  mfgDate?: string;
  expDate?: string;
  quantity?: number;
  mrp?: number;
}

export interface EmployeeBackendDto {
  id: number;
  code: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  joiningDate: string;
  address: string;
  photo?: string;
  active: boolean;
}

export interface PastOperationBackendDto {
  id?: number;
  type: string;
  bodyPart: string;
  place: string;
  deformity?: string;
}

export interface PatientBackendDto {
  id: number;
  code: string;
  name: string;
  phone: string;
  age: number;
  gender: string;
  weight?: number;
  height?: number;
  caste?: string;
  addressLine: string;
  state: string;
  city: string;
  pincode?: string;
  type: string;
  department: string;
  doctor: string;
  opdCharge: number;
  registeredAt: string;
  status: string;
  allergy?: string;
  deformity?: string;
  complaint?: string;
  mediclaim?: boolean;
  insuranceCompany?: string;
  policyNumber?: string;
  pastOperations: PastOperationBackendDto[];
}

export interface CreatePatientPayload {
  name: string;
  phone: string;
  age: number;
  gender: string;
  weight?: number;
  height?: number;
  caste?: string;
  addressLine: string;
  state: string;
  city: string;
  pincode?: string;
  type: string;
  department: string;
  doctor: string;
  opdCharge: number;
  allergy?: string;
  deformity?: string;
  complaint?: string;
  mediclaim?: boolean;
  insuranceCompany?: string;
  policyNumber?: string;
  pastOperations?: PastOperationBackendDto[];
}


export interface CreateEmployeePayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  department?: string;
  role: string;
  joiningDate: string;
  address?: string;
  photo?: string;
  active?: boolean;
}

export interface UpdateEmployeePayload {
  name: string;
  email: string;
  phone?: string;
  department?: string;
  role: string;
  joiningDate: string;
  address?: string;
  photo?: string;
  active: boolean;
}

export interface PrescribedMedicineBackendDto {
  medicineId: string;
  name: string;
  morning: string;
  afternoon: string;
  evening: string;
  night: string;
}

export interface PrescriptionBackendDto {
  id: number;
  patientId: string;
  diagnosis?: string;
  disease?: string;
  suggestion?: string;
  followUpDate?: string;
  courseDays?: number;
  createdAt: string;
  medicines: PrescribedMedicineBackendDto[];
}

export interface CreatePrescriptionPayload {
  patientId: string;
  diagnosis?: string;
  disease?: string;
  suggestion?: string;
  followUpDate?: string;
  courseDays?: number;
  medicines: PrescribedMedicineBackendDto[];
}

export interface BillItemBackendDto {
  medicineId: string;
  name: string;
  units: number;
  pieces: number;
  mrp: number;
  total: number;
}

export interface BillBackendDto {
  id: number;
  patientId: string;
  patientCode: string;
  subtotal: number;
  discountType: "flat" | "percent";
  discountValue: number;
  total: number;
  createdAt: string;
  items: BillItemBackendDto[];
}

export interface CreateBillPayload {
  patientId: string;
  patientCode: string;
  subtotal: number;
  discountType: "flat" | "percent";
  discountValue: number;
  total: number;
  items: BillItemBackendDto[];
}

export const apiService = {
  departments: {
    getAll: async (): Promise<DepartmentBackendDto[]> => {
      return apiClient<DepartmentBackendDto[]>("/department");
    },
    getById: async (id: number): Promise<DepartmentBackendDto> => {
      return apiClient<DepartmentBackendDto>(`/department/${id}`);
    },
    create: async (payload: CreateDepartmentPayload): Promise<DepartmentBackendDto> => {
      return apiClient<DepartmentBackendDto>("/department", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    update: async (id: number, payload: CreateDepartmentPayload): Promise<DepartmentBackendDto> => {
      return apiClient<DepartmentBackendDto>(`/department/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
    delete: async (id: number): Promise<void> => {
      return apiClient<void>(`/department/${id}`, {
        method: "DELETE",
      });
    },
  },
  charges: {
    getAll: async (): Promise<ChargeBackendDto[]> => {
      return apiClient<ChargeBackendDto[]>("/charge");
    },
    getById: async (id: number): Promise<ChargeBackendDto> => {
      return apiClient<ChargeBackendDto>(`/charge/${id}`);
    },
    create: async (payload: CreateChargePayload): Promise<ChargeBackendDto> => {
      return apiClient<ChargeBackendDto>("/charge", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    update: async (id: number, payload: UpdateChargePayload): Promise<ChargeBackendDto> => {
      return apiClient<ChargeBackendDto>(`/charge/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
    delete: async (id: number): Promise<void> => {
      return apiClient<void>(`/charge/${id}`, {
        method: "DELETE",
      });
    },
  },
  medicineCategories: {
    getAll: async (): Promise<MedicineCategoryBackendDto[]> => {
      return apiClient<MedicineCategoryBackendDto[]>("/medicinecategory");
    },
    getById: async (id: number): Promise<MedicineCategoryBackendDto> => {
      return apiClient<MedicineCategoryBackendDto>(`/medicinecategory/${id}`);
    },
    create: async (payload: CreateMedicineCategoryPayload): Promise<MedicineCategoryBackendDto> => {
      return apiClient<MedicineCategoryBackendDto>("/medicinecategory", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    update: async (id: number, payload: UpdateMedicineCategoryPayload): Promise<MedicineCategoryBackendDto> => {
      return apiClient<MedicineCategoryBackendDto>(`/medicinecategory/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
    delete: async (id: number): Promise<void> => {
      return apiClient<void>(`/medicinecategory/${id}`, {
        method: "DELETE",
      });
    },
  },
  medicines: {
    getAll: async (): Promise<MedicineBackendDto[]> => {
      return apiClient<MedicineBackendDto[]>("/medicine");
    },
    search: async (q: string): Promise<MedicineBackendDto[]> => {
      return apiClient<MedicineBackendDto[]>(`/medicine/search?q=${encodeURIComponent(q)}`);
    },
    getById: async (id: number): Promise<MedicineBackendDto> => {
      return apiClient<MedicineBackendDto>(`/medicine/${id}`);
    },
    create: async (payload: CreateMedicinePayload): Promise<MedicineBackendDto> => {
      return apiClient<MedicineBackendDto>("/medicine", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    update: async (id: number, payload: UpdateMedicinePayload): Promise<MedicineBackendDto> => {
      return apiClient<MedicineBackendDto>(`/medicine/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
    delete: async (id: number): Promise<void> => {
      return apiClient<void>(`/medicine/${id}`, {
        method: "DELETE",
      });
    },
  },
  patients: {
    getAll: async (): Promise<PatientBackendDto[]> => {
      return apiClient<PatientBackendDto[]>("/patient");
    },
    getById: async (id: number): Promise<PatientBackendDto> => {
      return apiClient<PatientBackendDto>(`/patient/${id}`);
    },
    getByCode: async (code: string): Promise<PatientBackendDto> => {
      return apiClient<PatientBackendDto>(`/patient/code/${code}`);
    },
    search: async (q: string): Promise<PatientBackendDto[]> => {
      return apiClient<PatientBackendDto[]>(`/patient/search?q=${encodeURIComponent(q)}`);
    },
    create: async (payload: CreatePatientPayload): Promise<PatientBackendDto> => {
      return apiClient<PatientBackendDto>("/patient", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    updateStatus: async (id: number, status: string): Promise<PatientBackendDto> => {
      return apiClient<PatientBackendDto>(`/patient/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
    }
  },
  prescriptions: {
    getAll: async (): Promise<PrescriptionBackendDto[]> => {
      return apiClient<PrescriptionBackendDto[]>("/prescription");
    },
    getById: async (id: number): Promise<PrescriptionBackendDto> => {
      return apiClient<PrescriptionBackendDto>(`/prescription/${id}`);
    },
    create: async (payload: CreatePrescriptionPayload): Promise<PrescriptionBackendDto> => {
      return apiClient<PrescriptionBackendDto>("/prescription", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }
  },
  bills: {
    getAll: async (): Promise<BillBackendDto[]> => {
      return apiClient<BillBackendDto[]>("/bill");
    },
    getById: async (id: number): Promise<BillBackendDto> => {
      return apiClient<BillBackendDto>(`/bill/${id}`);
    },
    create: async (payload: CreateBillPayload): Promise<BillBackendDto> => {
      return apiClient<BillBackendDto>("/bill", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }
  },
  employees: {
    getAll: async (): Promise<EmployeeBackendDto[]> => {
      return apiClient<EmployeeBackendDto[]>("/employee");
    },
    getById: async (id: number): Promise<EmployeeBackendDto> => {
      return apiClient<EmployeeBackendDto>(`/employee/${id}`);
    },
    create: async (payload: CreateEmployeePayload): Promise<EmployeeBackendDto> => {
      return apiClient<EmployeeBackendDto>("/employee", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    update: async (id: number, payload: UpdateEmployeePayload): Promise<EmployeeBackendDto> => {
      return apiClient<EmployeeBackendDto>(`/employee/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    },
    delete: async (id: number): Promise<void> => {
      return apiClient<void>(`/employee/${id}`, {
        method: "DELETE",
      });
    },
    toggle: async (id: number): Promise<EmployeeBackendDto> => {
      return apiClient<EmployeeBackendDto>(`/employee/${id}/toggle`, {
        method: "POST",
      });
    },
  },
  auth: {
    login: async (email: string, password: string): Promise<EmployeeBackendDto> => {
      return apiClient<EmployeeBackendDto>("/employee/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    },
    logout: async (): Promise<void> => {
      return apiClient<void>("/employee/logout", {
        method: "POST",
      });
    },
  },
  hospitalSettings: {
    uploadLogo: async (file: File): Promise<{ logoUrl: string }> => {
      const formData = new FormData();
      formData.append("file", file);
      
      const res = await fetch(`${BASE_URL}/HospitalSettings/upload-logo`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to upload logo");
      return res.json();
    }
  }
};
