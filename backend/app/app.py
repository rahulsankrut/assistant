from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
import google.generativeai as genai
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from bs4 import BeautifulSoup
import httpx
import urllib.parse
from routers import research, patients

load_dotenv()

app = FastAPI()

# MongoDB setup
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGODB_URL)
db = client.medical_assistant

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Google API
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=GOOGLE_API_KEY)

# Add conversation history management
conversation_contexts = {}

class ConversationContext:
    def __init__(self):
        self.messages = []
        self.clinical_findings = []
        self.differential_diagnoses = []
        
    def add_message(self, content: str, role: str):
        self.messages.append({"role": role, "content": content})
        if len(self.messages) > 10:  # Keep last 10 messages
            self.messages.pop(0)
    
    def get_context(self) -> dict:
        return {
            "clinical_findings": self.clinical_findings,
            "differential_diagnoses": self.differential_diagnoses,
            "recent_messages": self.messages[-3:] if self.messages else []  # Last 3 messages
        }

class DoctorNotes(BaseModel):
    physical_exam: str = ""
    clinical_notes: str = ""
    potential_diagnosis: str = ""

class Query(BaseModel):
    question: str
    patient_data: Dict[str, str] = {
        "age": "",
        "gender": "",
        "chief_complaint": "",
        "vital_signs": "",
        "medical_history": "",
        "current_medications": "",
        "allergies": "",
        "lab_results": "",
    }
    clinical_findings: List[str] = []
    symptoms: List[str] = []
    conversation_id: Optional[str] = None
    doctor_notes: Optional[DoctorNotes] = None

class Response(BaseModel):
    answer: str

class DiagnosisAnalysisRequest(BaseModel):
    diagnosis: str
    symptoms: List[str]
    patient_data: Dict[str, Any]

def setup_gemini():
    """Initialize and return the Gemini model"""
    return genai.GenerativeModel('gemini-pro')

def generate_prompt(query: Query, context: dict) -> str:
    """Generate a contextual prompt for clinical discussion"""
    prompt = """You are an AI clinical assistant engaging in an ongoing medical dialogue. 
Format your response in markdown using:
- **Bold** for important terms and emphasis
- *Italics* for medical terminology
- ### For section headers
- Bullet points for lists
- > For important warnings or notes
- Code blocks for measurements or lab values

Patient Overview:
"""
    
    for key, value in query.patient_data.items():
        if value:
            prompt += f"- {key.replace('_', ' ').title()}: {value}\n"

    if query.doctor_notes and (
        query.doctor_notes.physical_exam or 
        query.doctor_notes.clinical_notes or 
        query.doctor_notes.potential_diagnosis
    ):
        prompt += "\nDoctor's Notes:\n"
        if query.doctor_notes.physical_exam:
            prompt += f"Physical Examination:\n{query.doctor_notes.physical_exam}\n"
        if query.doctor_notes.clinical_notes:
            prompt += f"Clinical Notes:\n{query.doctor_notes.clinical_notes}\n"
        if query.doctor_notes.potential_diagnosis:
            prompt += f"Potential Diagnosis:\n{query.doctor_notes.potential_diagnosis}\n"

    if context["recent_messages"]:
        prompt += "\nRecent Discussion:\n"
        for msg in context["recent_messages"]:
            prompt += f"{msg['role'].title()}: {msg['content']}\n"
    
    if query.symptoms:
        prompt += "\nReported Symptoms:\n"
        for symptom in query.symptoms:
            prompt += f"- {symptom}\n"
    
    if context["clinical_findings"]:
        prompt += "\nEstablished Clinical Findings:\n"
        for finding in context["clinical_findings"]:
            prompt += f"- {finding}\n"

    prompt += f"\nCurrent Query: {query.question}\n\n"
    
    prompt += """Continue our discussion naturally, considering the conversation history.
Maintain a professional yet conversational tone, as if we're colleagues discussing a case.
Focus on addressing the current query while building on our previous discussion.

IMPORTANT: Format your entire response using markdown syntax for better readability."""
    
    return prompt

def generate_patient_summary(patient_data: Dict[str, str]) -> str:
    """Generate a concise patient summary"""
    prompt = """As a medical AI assistant, provide a very brief (2-3 sentences) clinical summary of this patient:

Patient Information:
"""
    for key, value in patient_data.items():
        if value:
            prompt += f"- {key.replace('_', ' ').title()}: {value}\n"
    
    prompt += "\nProvide a concise, clinically relevant summary focusing on key findings and concerns."
    
    try:
        model = setup_gemini()
        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.3,
                "max_output_tokens": 150,
            }
        )
        return response.text if response else "No summary available"
    except Exception as e:
        print("Error generating summary:", str(e))
        return "Unable to generate summary"

@app.post("/ask", response_model=Response)
async def get_medical_information(query: Query):
    """Process medical queries with conversation context"""
    try:
        # Get or create conversation context
        context = conversation_contexts.get(query.conversation_id)
        if not context:
            context = ConversationContext()
            conversation_contexts[query.conversation_id] = context
        
        model = setup_gemini()
        prompt = generate_prompt(query, context.get_context())
        
        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.7,
                "max_output_tokens": 1024,
            }
        )
        
        if not response or not response.text:
            raise HTTPException(status_code=500, detail="No response generated")
        
        # Update conversation context
        context.add_message(query.question, "user")
        context.add_message(response.text, "assistant")
            
        return Response(answer=response.text)
    
    except Exception as e:
        print("Error processing request:", str(e))
        raise HTTPException(status_code=500, detail="Service temporarily unavailable. Please try again.")

@app.get("/patients")
async def get_patients():
    """Get all patients"""
    try:
        patients = await db.patients.find().to_list(1000)
        for patient in patients:
            patient["_id"] = str(patient["_id"])
        return patients
    except Exception as e:
        print("MongoDB Error:", str(e))
        # Fallback to sample data if DB fails
        return [
            {
                "id": "1",
                "name": "John Doe",
                "age": "45",
                "gender": "male",
                "chief_complaint": "chest pain",
                "vital_signs": "BP 120/80, HR 72",
                "medical_history": "Hypertension",
                "current_medications": "Lisinopril",
                "allergies": "None",
                "lab_results": "Normal CBC",
                "status": "Active"
            }
        ]

@app.get("/patients/{patient_id}")
async def get_patient(patient_id: str):
    """Get a specific patient"""
    try:
        patient = await db.patients.find_one({"id": patient_id})
        if patient:
            patient["_id"] = str(patient["_id"])
            return patient
        raise HTTPException(status_code=404, detail="Patient not found")
    except Exception as e:
        print("MongoDB Error:", str(e))
        # Fallback to sample data if DB fails
        return {
            "id": patient_id,
            "name": "John Doe",
            "age": "45",
            "gender": "male",
            "chief_complaint": "chest pain",
            "vital_signs": "BP 120/80, HR 72",
            "medical_history": "Hypertension",
            "current_medications": "Lisinopril",
            "allergies": "None",
            "lab_results": "Normal CBC",
            "status": "Active"
        }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

@app.get("/patient-summary/{patient_id}")
async def get_patient_summary(patient_id: str):
    """Get a patient's summary"""
    try:
        patient = await db.patients.find_one({"id": patient_id})
        if patient:
            summary = generate_patient_summary(patient)
            return {"summary": summary}
        raise HTTPException(status_code=404, detail="Patient not found")
    except Exception as e:
        print("Error:", str(e))
        raise HTTPException(status_code=500, detail="Error generating summary")

@app.post("/predict-diseases")
async def predict_diseases(data: dict):
    try:
        model = setup_gemini()
        
        prompt = f"""As an AI medical assistant, analyze the following patient information and provide a structured assessment of potential diseases and their likelihood. Consider both the symptoms and medical history carefully.

Patient Information:
Age: {data.get('age', 'Not specified')}
Gender: {data.get('gender', 'Not specified')}
Current Symptoms: {', '.join(data.get('symptoms', []))}
Medical History: {data.get('medical_history', 'None provided')}
Vital Signs: {data.get('vital_signs', 'Not available')}
Current Medications: {data.get('current_medications', 'None listed')}

Please provide:
1. Top potential diagnoses (most likely conditions based on the information provided)
2. Likelihood assessment for each (High/Medium/Low)
3. Key supporting factors for each diagnosis
4. Recommended additional tests or examinations

Note: This is an AI-generated assessment and should not replace professional medical diagnosis."""

        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.3,
                "max_output_tokens": 1024,
            }
        )
        
        return {"prediction": response.text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze-diagnosis")
async def analyze_diagnosis(request: DiagnosisAnalysisRequest):
    try:
        model = setup_gemini()
        
        # Clean and validate the diagnosis string
        diagnosis = request.diagnosis.strip()
        if not diagnosis:
            raise HTTPException(status_code=400, detail="Diagnosis cannot be empty")
        
        prompt = f"""As an AI medical assistant, provide a detailed analysis of why {diagnosis} is being considered as a potential diagnosis for this patient.

Patient Information:
- Age: {request.patient_data.get('age', 'Not specified')}
- Gender: {request.patient_data.get('gender', 'Not specified')}
- Current Symptoms: {', '.join(request.symptoms)}
- Medical History: {request.patient_data.get('medical_history', 'None')}
- Current Medications: {request.patient_data.get('current_medications', 'None')}
- Vital Signs: {request.patient_data.get('vital_signs', 'None')}

Provide your analysis in markdown format using the following structure:

## Symptom Correlation
[Explain how the patient's symptoms align with {diagnosis}]

## Patient Profile & Risk Factors
[Discuss how the patient's age, gender, and other characteristics relate to this diagnosis]

## Key Clinical Indicators
[List and explain the main clinical findings that support this diagnosis]

## Concerning Features
[Highlight any red flags or features requiring immediate attention]

## Differential Diagnoses
[List other conditions to consider and why they should be ruled out]

## Medical History Relevance
[Explain how the patient's medical history impacts this diagnosis]

## Recommendations
[Suggest next steps, tests, or monitoring required]

Use markdown formatting:
- Use bullet points where appropriate
- Use **bold** for emphasis
- Use *italics* for medical terms
- Use > for important notes or warnings
- Use ### for subsections if needed"""

        try:
            response = model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.3,
                    "max_output_tokens": 1024,
                }
            )
            
            if not response or not response.text:
                raise HTTPException(
                    status_code=500,
                    detail="No response generated from the AI model"
                )
            
            return {"analysis": response.text}
            
        except Exception as model_error:
            print(f"Gemini API Error: {str(model_error)}")
            raise HTTPException(
                status_code=500,
                detail="Error generating analysis from AI model"
            )
            
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while analyzing the diagnosis"
        )

# Include routers
app.include_router(research.router, tags=["research"])
app.include_router(patients.router, tags=["patients"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)