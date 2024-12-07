export interface Patient {
  id: string;
  name: string;
  age: string;
  gender: string;
  chief_complaint: string;
  vital_signs: string;
  medical_history: string;
  current_medications: string;
  allergies: string;
  lab_results: string;
  photo?: string;
  status: 'Active' | 'Inactive';
}

export interface PatientState {
  patients: Patient[];
  selectedPatient: Patient | null;
  isLoading: boolean;
  error: string | null;
}
