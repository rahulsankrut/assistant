"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { patientService } from '../services/patientService';
import { Patient } from '../types/patient';
import DiseasePrediction from '../components/DiseasePrediction';
import MedicalResearch from '../components/MedicalResearch';
import ChatAssistant from '../components/ChatAssistant';

const ClinicalAssistant = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [patientData, setPatientData] = useState<Patient>({
    age: '',
    gender: '',
    chief_complaint: '',
    vital_signs: '',
    medical_history: '',
    current_medications: '',
    allergies: '',
    lab_results: '',
    name: '',
    id: '',
    status: 'Inactive'
  });
  const [clinicalFindings, setClinicalFindings] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState(() => `clinic_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [symptomInput, setSymptomInput] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [showPatientSelector, setShowPatientSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Inactive'>('all');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [patientSummary, setPatientSummary] = useState<string>("");
  const [doctorNotes, setDoctorNotes] = useState<DoctorNotes>({
    physicalExam: '',
    clinicalNotes: '',
    potentialDiagnosis: ''
  });
  const [activeTab, setActiveTab] = useState<'chat' | 'prediction' | 'research'>('chat');

  useEffect(() => {
    let mounted = true;

    const fetchPatients = async () => {
      try {
        setLoading(true);
        const data = await patientService.getAllPatients();
        if (mounted) {
          setPatients(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch patients');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchPatients();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      setMessages([]);
      setConversationId(`clinic_${selectedPatient.id}_${Date.now()}`);
      setPatientData(selectedPatient);
      fetch(`http://localhost:8000/patient-summary/${selectedPatient.id}`)
        .then(res => res.json())
        .then(data => {
          setPatientSummary(data.summary);
          setMessages([{
            type: 'assistant',
            content: `I'm ready to discuss patient ${selectedPatient.name}. What would you like to know?`
          }]);
        })
        .catch(err => console.error("Error fetching summary:", err));
    }
  }, [selectedPatient]);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    
    setIsLoading(true);
    setMessages(prev => [...prev, { type: 'user', content: input }]);

    try {
      const payload = {
        question: input,
        patient_data: {
          age: patientData.age || "",
          gender: patientData.gender || "",
          chief_complaint: patientData.chief_complaint || "",
          vital_signs: patientData.vital_signs || "",
          medical_history: patientData.medical_history || "",
          current_medications: patientData.current_medications || "",
          allergies: patientData.allergies || "",
          lab_results: patientData.lab_results || "",
        },
        clinical_findings: clinicalFindings,
        symptoms: symptoms,
        conversation_id: conversationId,
        doctor_notes: {
          physical_exam: doctorNotes.physicalExam,
          clinical_notes: doctorNotes.clinicalNotes,
          potential_diagnosis: doctorNotes.potentialDiagnosis
        }
      };
      
      const response = await fetch('http://localhost:8000/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setMessages(prev => [...prev, {
        type: 'assistant',
        content: data.answer
      }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        type: 'error',
        content: 'Sorry, there was an error processing your request.'
      }]);
    }

    setIsLoading(false);
    setInput('');
  };

  const addSymptom = () => {
    if (symptomInput.trim()) {
      setSymptoms([...symptoms, symptomInput.trim()]);
      setSymptomInput('');
    }
  };

  const PatientSelector = () => {
    const filteredPatients = patients.filter(patient => {
      const matchesSearch = 
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        patient.chief_complaint.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = 
        statusFilter === 'all' || patient.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });

    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="bg-white/80 backdrop-blur-lg shadow-2xl rounded-3xl p-6 mb-6 border border-white/20"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-indigo-700">Select Patient</h2>
          <button
            onClick={() => setShowPatientSelector(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search and Filter Controls */}
        <div className="mb-6 space-y-4">
          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name, ID, or condition..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 
                focus:border-indigo-300 focus:ring focus:ring-indigo-200 
                focus:ring-opacity-50 pl-10"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Filter Controls */}
          <div className="flex gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${statusFilter === 'all' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter('Active')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${statusFilter === 'Active' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter('Inactive')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${statusFilter === 'Inactive' 
                  ? 'bg-gray-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Inactive
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-600">
          Found {filteredPatients.length} patient{filteredPatients.length !== 1 ? 's' : ''}
        </div>

        {/* Patient Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.length > 0 ? (
            filteredPatients.map((patient) => (
              <motion.div
                key={patient.id}
                whileHover={{ scale: 1.02 }}
                className={`p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                  selectedPatient?.id === patient.id
                    ? 'bg-indigo-100 border-2 border-indigo-500'
                    : 'bg-white border border-gray-200 hover:border-indigo-300'
                }`}
                onClick={() => {
                  setSelectedPatient(patient);
                  setShowPatientSelector(false);
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden">
                    {patient.photo ? (
                      <img 
                        src={patient.photo} 
                        alt={patient.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{patient.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span>ID: {patient.id}</span>
                      <span>•</span>
                      <span>Age: {patient.age}</span>
                    </div>
                    <span className={`inline-block mt-1 px-2 py-1 text-xs rounded-full ${
                      patient.status === 'Active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {patient.status}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full text-center py-8 text-gray-500">
              No patients found matching your search criteria
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  const PatientSelectorButton = () => (
    <button
      onClick={() => setShowPatientSelector(true)}
      className="fixed top-4 right-4 bg-white/80 backdrop-blur-lg shadow-lg rounded-full p-3 
        hover:bg-indigo-50 transition-all duration-200 z-50"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8">
      <PatientSelectorButton />
      {showPatientSelector && <PatientSelector />}
      <div className="max-w-7xl mx-auto p-4 flex gap-6">
        {/* Main Chat Section */}
        <div className="flex-grow max-w-5xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-lg shadow-2xl rounded-3xl p-8 border border-white/20"
          >
            <div className="flex items-center justify-between mb-8">
              <motion.h1 
                initial={{ x: -20 }}
                animate={{ x: 0 }}
                className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text"
              >
                AI Medical Assistant
              </motion.h1>
              {isLoading && (
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce"></div>
                </div>
              )}
            </div>

            <div className="mb-6 flex space-x-4">
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-6 py-3 rounded-xl transition-all duration-300 font-medium
                  ${activeTab === 'chat'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-indigo-50'
                  }`}
              >
                Chat Assistant
              </button>
              <button
                onClick={() => setActiveTab('prediction')}
                className={`px-6 py-3 rounded-xl transition-all duration-300 font-medium
                  ${activeTab === 'prediction'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-indigo-50'
                  }`}
              >
                Disease Prediction
              </button>
              <button
                onClick={() => setActiveTab('research')}
                className={`px-6 py-3 rounded-xl transition-all duration-300 font-medium
                  ${activeTab === 'research'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-indigo-50'
                  }`}
              >
                Research
              </button>
            </div>

            {activeTab === 'chat' ? (
                <ChatAssistant
                symptomInput={symptomInput}
                setSymptomInput={setSymptomInput}
                addSymptom={addSymptom}
                symptoms={symptoms}
                setSymptoms={setSymptoms}
                doctorNotes={doctorNotes}
                setDoctorNotes={setDoctorNotes}
                messages={messages}
                input={input}
                setInput={setInput}
                handleSubmit={handleSubmit}
                isLoading={isLoading}
              />
            ) : activeTab === 'prediction' ? (
              <DiseasePrediction 
                key={selectedPatient?.id || 'no-patient'}
                patientData={patientData}
                symptoms={symptoms}
              />
            ) : (
              <MedicalResearch />
            )}
          </motion.div>
        </div>

        {/* Patient Information Sidebar */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-96 shrink-0"
        >
          <div className="bg-white/80 backdrop-blur-lg shadow-2xl rounded-3xl p-6 border border-white/20 sticky top-8">
            <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text mb-6">
              Patient Information
            </h2>
            
            <div className="space-y-6 max-h-[calc(100vh-300px)] overflow-y-auto pr-2 
              scrollbar-thin scrollbar-thumb-indigo-300 scrollbar-track-transparent">
              <div className="mb-6 border-b border-indigo-100 pb-6">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center overflow-hidden">
                      {patientData.photo ? (
                        <img 
                          src={patientData.photo} 
                          alt="Patient" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>
                  </div>

                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {patientData.name || 'Patient Name'}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                        </svg>
                        ID: {patientData.id || 'Not assigned'}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {patientData.age || 'Age not specified'}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        patientData.status === 'Active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {patientData.status || 'Status unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-indigo-50 rounded-xl p-4">
                  <h3 className="text-lg font-semibold text-indigo-700 mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Clinical Summary
                  </h3>
                  <div className="bg-indigo-50 rounded-xl p-4 space-y-2">
                    {patientSummary ? (
                      <p className="text-gray-700">{patientSummary}</p>
                    ) : (
                      <p className="text-gray-500 italic">No clinical summary available</p>
                    )}
                  </div>
                </div>

                <div className="bg-indigo-50 rounded-xl p-4">
                  <h3 className="text-lg font-semibold text-indigo-700 mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Vital Signs
                  </h3>
                  <div className="bg-indigo-50 rounded-xl p-4 space-y-2">
                    {patientData.vital_signs ? (
                      <p className="text-gray-700">{patientData.vital_signs}</p>
                    ) : (
                      <p className="text-gray-500 italic">No vital signs recorded</p>
                    )}
                  </div>
                </div>

                <div className="bg-indigo-50 rounded-xl p-4">
                  <h3 className="text-lg font-semibold text-indigo-700 mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Medical History
                  </h3>
                  <div className="bg-indigo-50 rounded-xl p-4 space-y-2">
                    {patientData.medical_history ? (
                      <p className="text-gray-700">{patientData.medical_history}</p>
                    ) : (
                      <p className="text-gray-500 italic">No medical history recorded</p>
                    )}
                  </div>
                </div>

                <div className="bg-indigo-50 rounded-xl p-4">
                  <h3 className="text-lg font-semibold text-indigo-700 mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Current Medications
                  </h3>
                  <div className="bg-indigo-50 rounded-xl p-4 space-y-2">
                    {patientData.current_medications ? (
                      <p className="text-gray-700">{patientData.current_medications}</p>
                    ) : (
                      <p className="text-gray-500 italic">No medications recorded</p>
                    )}
                  </div>
                </div>

                <div className="bg-indigo-50 rounded-xl p-4">
                  <h3 className="text-lg font-semibold text-indigo-700 mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Allergies
                  </h3>
                  <div className="bg-indigo-50 rounded-xl p-4 space-y-2">
                    {patientData.allergies ? (
                      <p className="text-gray-700">{patientData.allergies}</p>
                    ) : (
                      <p className="text-gray-500 italic">No allergies recorded</p>
                    )}
                  </div>
                </div>

                <div className="bg-indigo-50 rounded-xl p-4">
                  <h3 className="text-lg font-semibold text-indigo-700 mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                    Lab Results
                  </h3>
                  <div className="bg-indigo-50 rounded-xl p-4 space-y-2">
                    {patientData.lab_results ? (
                      <p className="text-gray-700">{patientData.lab_results}</p>
                    ) : (
                      <p className="text-gray-500 italic">No lab results recorded</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ClinicalAssistant;