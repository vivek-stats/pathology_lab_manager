export type Gender = 'male' | 'female' | 'other';
export type AgeUnit = 'years' | 'months' | 'days';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid';
export type PaymentMethod = 'cash' | 'card' | 'upi' | 'net_banking';
export type VisitStatus = 'registered' | 'sample_collected' | 'processing' | 'partial_ready' | 'completed' | 'cancelled';
export type ParameterStatus = 'normal' | 'low' | 'high' | 'abnormal' | 'pending';
export type UserRole = 'admin' | 'technician' | 'receptionist' | 'pathologist';

export interface ITestParameter {
  name: string;
  unit: string;
  normalRange: string;
  low?: number;
  high?: number;
  genderSpecific?: boolean;
  maleNormalRange?: string;
  femaleNormalRange?: string;
}

export interface ITest {
  _id: string;
  code: string;
  name: string;
  category: string;
  sampleType: string;
  price: number;
  tatHours?: number;
  parameters: ITestParameter[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IDoctor {
  _id: string;
  name: string;
  code?: string;
  qualification?: string;
  specialization?: string;
  clinicAddress?: string;
  mobile?: string;
  email?: string;
  commissionPercent: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IDoctorPayment {
  _id: string;
  doctor: string | IDoctor;
  amount: number;
  paymentDate: string;
  dateStringIST: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'upi' | 'cheque';
  referenceNumber?: string;
  notes?: string;
  isAdjustment?: boolean;
  recordedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IDoctorDashboardMetrics {
  doctor: IDoctor;
  dateRange: {
    from: string;
    to: string;
  };
  metrics: {
    uniquePatientCount: number;
    totalVisitsCount: number;
    eligibleVisitsCount: number;
    cancelledVisitsCount: number;
    totalTestsCount: number;
    totalEligibleAmount: number;
    totalCommissionEarned: number;
    totalCommissionPaid: number;
    lifetimeEarned: number;
    lifetimePaid: number;
    outstandingCommission: number;
  };
  visits: any[];
  payments: IDoctorPayment[];
}

export interface IPatient {
  _id: string;
  patientId: string; // Permanent ID, e.g., PAT-202610-0001
  name: string;
  age: number;
  ageUnit: AgeUnit;
  gender: Gender;
  mobile?: string;
  email?: string;
  address?: string;
  bloodGroup?: string;
  emergencyContact?: string;
  referredByDoctor?: string | IDoctor;
  referredByDoctorName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IResultItem {
  testId: string;
  testName: string;
  parameterName: string;
  value: string;
  unit: string;
  normalRange: string;
  status: ParameterStatus;
  enteredAt?: string;
  enteredBy?: string;
}

export interface IResultRevision {
  revisionNumber: number;
  savedAt: string;
  savedBy: string;
  reasonForChange: string;
  results: IResultItem[];
}

export interface IPaymentRecord {
  amount: number;
  method: PaymentMethod;
  date: string;
  transactionRef?: string;
  receivedBy?: string;
}

export interface IVisitBilling {
  totalAmount: number;
  discount: number;
  netAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentStatus: PaymentStatus;
  payments: IPaymentRecord[];
}

export interface IVisitTestSnapshot {
  testId: string;
  code: string;
  name: string;
  category: string;
  sampleType: string;
  price: number;
  parameters: ITestParameter[];
}

export interface IVisit {
  _id: string;
  visitId: string; // VIS-20261026-0001
  dailySerial: number; // Daily serial/token #1, #2, #3
  patientVisitNumber?: number; // Patient lifetime visit sequence (#1, #2, etc.)
  totalPatientVisits?: number;
  dateStringIST: string; // "2026-10-26"
  visitDate: string;
  patient: IPatient | string;
  patientSnapshot: {
    name: string;
    age: number;
    ageUnit: AgeUnit;
    gender: Gender;
    mobile: string;
    permanentId: string;
    address?: string;
  };
  doctor?: IDoctor | string | null;
  doctorSnapshot?: {
    doctorId?: string;
    name: string;
    commissionPercent: number;
    eligibleAmount?: number;
    commissionAmount?: number;
  };
  doctorAuditTrail?: {
    previousDoctorId?: string;
    previousDoctorName: string;
    previousCommissionRate: number;
    previousCommissionAmount: number;
    newDoctorId?: string;
    newDoctorName: string;
    newCommissionRate: number;
    newCommissionAmount: number;
    reason: string;
    changedBy: string;
    changedAt: string;
  }[];
  tests: IVisitTestSnapshot[];
  results: IResultItem[];
  resultRevisions: IResultRevision[];
  status: VisitStatus;
  billing: IVisitBilling;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IDashboardStats {
  todayPatientsCount: number;
  todayRevenue: number;
  todayPendingBalance: number;
  todayPendingReports: number;
  todayCompletedReports: number;
  totalRegisteredPatients: number;
}

export interface ILabSettings {
  _id?: string;
  key?: string;
  labName: string;
  tagline?: string;
  logoUrl?: string;
  registrationNumber?: string;
  accreditation?: string;

  // Contact Info
  primaryPhone: string;
  secondaryPhone?: string;
  email?: string;
  website?: string;
  whatsapp?: string;

  // Laboratory Address
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;

  // Report & Receipt Preferences
  reportHeader?: string;
  reportFooter?: string;
  receiptFooter?: string;
  signatoryName?: string;
  signatoryDesignation?: string;
  currency: string;
  timezone: string;

  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_LAB_SETTINGS: ILabSettings = {
  key: 'default',
  labName: 'Apex Diagnostics & Pathology Laboratory',
  tagline: 'Precision Diagnostics & Advanced Blood Testing',
  logoUrl: '',
  registrationNumber: 'DL-REG-2024-88492',
  accreditation: 'ISO 15189:2022 STANDARDS',
  primaryPhone: '+91 98765 43210',
  secondaryPhone: '+91 11 2345 6789',
  email: 'info@apexpathology.lab',
  website: 'https://apexpathology.lab',
  whatsapp: '+91 98765 43210',
  addressLine1: 'Plot 42, Health City Enclave',
  addressLine2: 'Ring Road',
  city: 'New Delhi',
  state: 'Delhi',
  postalCode: '110001',
  country: 'India',
  reportHeader: 'Official Medical Examination & Pathology Investigation Report',
  reportFooter: 'This is a computer-generated diagnostic report. Medical interpretations should be correlated clinically by a qualified medical practitioner.',
  receiptFooter: 'Thank you for choosing our pathology services. Please retain this receipt for test report collection.',
  signatoryName: 'Dr. Vivek Sharma',
  signatoryDesignation: 'MD (Pathology), Consultant Pathologist',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
};

