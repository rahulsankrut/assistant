import { Patient } from '../types/patient';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const fetchWithTimeout = async (url: string, options: RequestInit = {}) => {
  const timeout = 5000; // 5 seconds timeout
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

export const patientService = {
  // Get all patients
  async getAllPatients(): Promise<Patient[]> {
    try {
      const response = await fetchWithTimeout(`${API_BASE_URL}/patients`);
      if (!response.ok) throw new Error('Failed to fetch patients');
      return response.json();
    } catch (error) {
      console.error('Error fetching patients:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw error;
    }
  },

  // Get single patient by ID
  async getPatientById(id: string): Promise<Patient> {
    try {
      const response = await fetch(`${API_BASE_URL}/patients/${id}`);
      if (!response.ok) throw new Error('Failed to fetch patient');
      return response.json();
    } catch (error) {
      console.error('Error fetching patient:', error);
      throw error;
    }
  },

  // Update patient
  async updatePatient(id: string, data: Partial<Patient>): Promise<Patient> {
    try {
      const response = await fetch(`${API_BASE_URL}/patients/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update patient');
      return response.json();
    } catch (error) {
      console.error('Error updating patient:', error);
      throw error;
    }
  },

  // Add new patient
  async addPatient(data: Omit<Patient, 'id'>): Promise<Patient> {
    try {
      const response = await fetch(`${API_BASE_URL}/patients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to add patient');
      return response.json();
    } catch (error) {
      console.error('Error adding patient:', error);
      throw error;
    }
  }
};
