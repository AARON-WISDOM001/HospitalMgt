export enum UserRole {
  ADMIN = 'admin',
  DOCTOR = 'doctor',
  NURSE = 'nurse',
  PHARMACIST = 'pharmacist',
  ACCOUNTANT = 'accountant'
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  phone?: string;
  status: 'active' | 'inactive';
  createdAt: any;
}

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  gender: 'male' | 'female' | 'other';
  bloodGroup?: string;
  address?: string;
  phone?: string;
  nextOfKin?: {
    name: string;
    relationship: string;
    phone: string;
  };
  medicalHistory?: string[];
  createdAt: any;
}

export interface Visit {
  id: string;
  patientId: string;
  patientName?: string;
  reason: string;
  department: string;
  status: 'pending' | 'triage' | 'doctor' | 'lab' | 'pharmacy' | 'billing' | 'completed';
  doctorId?: string;
  doctorName?: string;
  nurseId?: string;
  vitals?: {
    temperature?: string;
    bloodPressure?: string;
    weight?: string;
    heartRate?: string;
  };
  createdAt: any;
  updatedAt: any;
}

export interface Prescription {
  id: string;
  visitId: string;
  patientId: string;
  doctorId: string;
  medications: Array<{
    drugName: string;
    dosage: string;
    duration: string;
    instructions: string;
  }>;
  status: 'pending' | 'dispensed';
  createdAt: any;
}

export interface LabTest {
  id: string;
  visitId: string;
  patientId: string;
  doctorId: string;
  testName: string;
  status: 'pending' | 'completed';
  results?: string;
  labTechnicianId?: string;
  createdAt: any;
}

export interface Invoice {
  id: string;
  visitId: string;
  patientId: string;
  items: Array<{
    description: string;
    amount: number;
    category: 'consultation' | 'lab' | 'pharmacy' | 'other';
  }>;
  totalAmount: number;
  status: 'unpaid' | 'paid';
  paymentMethod?: 'cash' | 'bank_transfer' | 'insurance';
  createdAt: any;
  updatedAt?: any;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  threshold: number;
  lastUpdated: any;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  clockIn: any;
  clockOut?: any;
}
