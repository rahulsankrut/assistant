import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

interface ChatAssistantProps {
    symptomInput: string;
    setSymptomInput: React.Dispatch<React.SetStateAction<string>>;
    addSymptom: () => void;
    symptoms: string[];
    setSymptoms: React.Dispatch<React.SetStateAction<string[]>>;
    doctorNotes: DoctorNotes;
    setDoctorNotes: React.Dispatch<React.SetStateAction<string>>;
    messages: Message;
    input: string;
    setInput: React.Dispatch<React.SetStateAction<string>>;
    handleSubmit: (event: React.FormEvent) => void;
    isLoading: boolean;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({
    symptomInput,
    setSymptomInput,
    addSymptom,
    symptoms,
    setSymptoms,
    doctorNotes,
    setDoctorNotes,
    messages,
    input,
    setInput,
    handleSubmit,
    isLoading
}) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingSection, setRecordingSection] = useState<'symptoms' | 'physicalExam' | 'clinicalNotes' | null>(null);

    const startRecording = (section: 'symptoms' | 'physicalExam' | 'clinicalNotes') => {
        if (!('webkitSpeechRecognition' in window)) {
            alert('Speech recognition is not supported in this browser. Please use Chrome.');
            return;
        }

        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsRecording(true);
            setRecordingSection(section);
        };

        recognition.onresult = (event: any) => {
            const transcript = Array.from(event.results)
                .map((result: any) => result[0])
                .map((result: any) => result.transcript)
                .join('');

            // Update the appropriate section based on recordingSection
            switch (section) {
                case 'symptoms':
                    setSymptomInput(transcript);
                    break;
                case 'physicalExam':
                    setDoctorNotes(prev => ({
                        ...prev,
                        physicalExam: transcript
                    }));
                    break;
                case 'clinicalNotes':
                    setDoctorNotes(prev => ({
                        ...prev,
                        clinicalNotes: transcript
                    }));
                    break;
            }
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            setIsRecording(false);
            setRecordingSection(null);
        };

        recognition.onend = () => {
            setIsRecording(false);
            setRecordingSection(null);
        };

        recognition.start();
    };

    const stopRecording = () => {
        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.stop();
        setIsRecording(false);
        setRecordingSection(null);
    };

    const RecordButton = ({ section, label }: { section: 'symptoms' | 'physicalExam' | 'clinicalNotes', label: string }) => (
        <button
            onClick={() => isRecording && recordingSection === section ? stopRecording() : startRecording(section)}
            className={`p-2 rounded-full transition-all duration-300 ${isRecording && recordingSection === section
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
            title={isRecording && recordingSection === section ? 'Stop recording' : 'Start recording'}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                {isRecording && recordingSection === section ? (
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                    />
                ) : (
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                )}
            </svg>
        </button>
    );

    return (
        <>
            <div className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100 shadow-lg">
                <h3 className="font-semibold mb-4 text-gray-700 flex items-center text-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Current Symptoms
                </h3>
                <div className="flex gap-3 mb-4">
                    <input
                        type="text"
                        placeholder="Add your symptoms..."
                        className="flex-1 px-4 py-3 rounded-xl border-2 border-indigo-100 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 transition-all duration-300 text-gray-700 bg-white shadow-inner"
                        value={symptomInput}
                        onChange={(e) => setSymptomInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addSymptom()}
                    />
                    <RecordButton section="symptoms" label="Record Symptoms" />
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={addSymptom}
                        className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 font-medium"
                    >
                        Add
                    </motion.button>
                </div>
                <motion.div layout className="flex flex-wrap gap-2">
                    {symptoms.map((symptom, index) => (
                        <motion.span
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            key={index}
                            className="px-4 py-2 bg-white rounded-full text-indigo-700 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border border-indigo-100 flex items-center gap-2"
                            onClick={() => setSymptoms(symptoms.filter((_, i) => i !== index))}
                        >
                            {symptom}
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-indigo-400 hover:text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </motion.span>
                    ))}
                </motion.div>
            </div>

            <div className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100 shadow-lg">
                <h3 className="font-semibold mb-4 text-gray-700 flex items-center text-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Doctor's Notes
                </h3>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Physical Examination</label>
                        <div className="relative">
                            <textarea
                                className="w-full px-4 py-3 rounded-xl border-2 border-indigo-100 
                            focus:border-indigo-300 focus:ring focus:ring-indigo-200 
                            focus:ring-opacity-50 transition-all duration-300
                            text-gray-700 bg-white shadow-inner min-h-[100px]"
                                value={doctorNotes.physicalExam}
                                onChange={(e) => setDoctorNotes(prev => ({
                                    ...prev,
                                    physicalExam: e.target.value
                                }))}
                                placeholder="Enter physical examination findings..."
                            />
                            <div className="absolute right-2 top-2">
                                <RecordButton section="physicalExam" label="Record Physical Exam" />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Clinical Notes</label>
                        <div className="relative">
                            <textarea
                                className="w-full px-4 py-3 rounded-xl border-2 border-indigo-100 
                            focus:border-indigo-300 focus:ring focus:ring-indigo-200 
                            focus:ring-opacity-50 transition-all duration-300
                            text-gray-700 bg-white shadow-inner min-h-[100px]"
                                value={doctorNotes.clinicalNotes}
                                onChange={(e) => setDoctorNotes(prev => ({
                                    ...prev,
                                    clinicalNotes: e.target.value
                                }))}
                                placeholder="Enter additional clinical notes..."
                            />
                            <div className="absolute right-2 top-2">
                                <RecordButton section="clinicalNotes" label="Record Clinical Notes" />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Potential Diagnosis</label>
                        <textarea
                            className="w-full px-4 py-3 rounded-xl border-2 border-indigo-100 
                          focus:border-indigo-300 focus:ring focus:ring-indigo-200 
                          focus:ring-opacity-50 transition-all duration-300
                          text-gray-700 bg-white shadow-inner"
                            value={doctorNotes.potentialDiagnosis}
                            onChange={(e) => setDoctorNotes(prev => ({
                                ...prev,
                                potentialDiagnosis: e.target.value
                            }))}
                            placeholder="Enter potential diagnoses..."
                        />
                    </div>
                </div>
            </div>

            {/* AI Medical Assistant Chat */}
            <div className="mb-6 bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100 shadow-lg">
                <h3 className="font-semibold mb-4 text-gray-700 flex items-center text-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    AI Medical Assistant Chat
                </h3>
                <div className="h-[500px] overflow-y-auto space-y-4 p-6 bg-white rounded-2xl border border-indigo-100 scrollbar-thin scrollbar-thumb-indigo-300 scrollbar-track-transparent">
                    {messages.map((message, index) => (
                        <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
                            <div className={message.type === 'user' ? "flex justify-end" : "flex justify-start"}>
                                <div className={message.type === 'user' ? "bg-indigo-600 text-white p-4 rounded-2xl rounded-tr-none max-w-[80%] shadow-md" : "bg-white p-6 rounded-2xl rounded-tl-none max-w-[80%] shadow-lg border border-gray-100"}>
                                    <ReactMarkdown className="prose prose-indigo max-w-none space-y-4">{message.content}</ReactMarkdown>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="mt-4 flex gap-3">
                    <input
                        type="text"
                        placeholder="Type your medical question..."
                        className="flex-1 px-6 py-4 rounded-xl border-2 border-indigo-100 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 transition-all duration-300 text-gray-700 bg-white shadow-inner"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                    />
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className={`px-8 py-4 rounded-xl transition-all duration-300 flex items-center gap-2 font-medium shadow-lg ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-xl text-white'}`}
                    >
                        {isLoading ? 'Sending...' : 'Send'}
                    </motion.button>
                </div>
            </div>
        </>
    );
};

export default ChatAssistant;