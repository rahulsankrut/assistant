from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional
import google.generativeai as genai
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

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

class Response(BaseModel):
    answer: str

def setup_gemini():
    """Initialize and return the Gemini model"""
    return genai.GenerativeModel('gemini-pro')

def generate_prompt(query: Query) -> str:
    """Generate a prompt for clinical decision support"""
    prompt = """You are an AI medical assistant for healthcare professionals. 
    Please provide a clear, structured clinical response using the following format:

ASSESSMENT:
- Brief summary of key findings and concerns

ANALYSIS:
- Detailed evaluation of symptoms and findings
- Potential clinical implications

RECOMMENDATIONS:
- Key action items and next steps
- Suggested tests or evaluations

Please consider the following information:

Patient Information:
"""
    
    for key, value in query.patient_data.items():
        if value:
            prompt += f"- {key.replace('_', ' ').title()}: {value}\n"
    
    if query.symptoms:
        prompt += "\nReported Symptoms:\n"
        for symptom in query.symptoms:
            prompt += f"- {symptom}\n"
    
    if query.clinical_findings:
        prompt += "\nClinical Findings:\n"
        for finding in query.clinical_findings:
            prompt += f"- {finding}\n"

    prompt += f"\nCurrent Query: {query.question}\n"
    
    return prompt

@app.post("/ask", response_model=Response)
async def get_medical_information(query: Query):
    """Process medical queries and return responses"""
    try:
        model = setup_gemini()
        prompt = generate_prompt(query)
        
        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.7,
                "max_output_tokens": 1024,
            }
        )
        
        if not response or not response.text:
            raise HTTPException(status_code=500, detail="No response generated")
            
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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)