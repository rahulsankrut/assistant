interface Window {
  webkitSpeechRecognition: any;
} 

interface Message {
  type: 'user' | 'assistant' | 'error';
  content: string;
}

interface DoctorNotes {
  physicalExam: string;
  clinicalNotes: string;
  potentialDiagnosis: string;
}