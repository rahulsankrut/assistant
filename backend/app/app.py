# Standard library imports
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
import os
from datetime import datetime
from string import Template

# Third-party imports
import google.generativeai as genai
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from bs4 import BeautifulSoup
import httpx
import urllib.parse

# Local imports
from routers import research, patients

# Load environment variables from .env file
load_dotenv()

# Add a configuration class for better organization
class Settings(BaseModel):
    """Application settings and configuration"""
    mongodb_url: str = Field(default=os.getenv("MONGODB_URL", "mongodb://localhost:27017"))
    google_api_key: Optional[str] = Field(default=os.getenv("GOOGLE_API_KEY", None))
    max_conversation_history: int = Field(default=int(os.getenv("MAX_CONVERSATION_HISTORY", "10")))
    allowed_origins: List[str] = Field(default=["http://localhost:3000"])
    model_temperature: float = Field(default=0.7)
    max_output_tokens: int = Field(default=1024)

    def validate_settings(self):
        """Validate required settings after initialization"""
        if not self.google_api_key:
            raise ValueError(
                "GOOGLE_API_KEY is not set. Please set it in your environment variables or .env file"
            )
        return self

    class Config:
        env_file = ".env"

# Initialize settings with validation
try:
    settings = Settings().validate_settings()
except Exception as e:
    print(f"Settings Error: {str(e)}")
    print("Please ensure you have set up your .env file with the required GOOGLE_API_KEY")
    raise

# Update the FastAPI app configuration
app = FastAPI()

# Configure CORS middleware with settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB Configuration
client = AsyncIOMotorClient(settings.mongodb_url)
db = client.medical_assistant

# Google API Configuration
genai.configure(api_key=settings.google_api_key)

# Global state management
conversation_contexts = {}
last_generated_prompt = ""

class ConversationManager:
    """Manages conversation context including messages, clinical data, and findings"""
    
    def __init__(self):
        self.messages = []
        self.clinical_findings = []
        self.differential_diagnoses = []
        self.current_diagnosis = None
        self.red_flags = []
        
    def add_message(self, content: str, role: str):
        """Add a message to the conversation history"""
        self.messages.append({
            "role": role,
            "content": content,
            "timestamp": datetime.now()
        })
        if len(self.messages) > 10:  # Keep last 10 messages
            self.messages.pop(0)
    
    def add_clinical_finding(self, finding: str):
        """Add a clinical finding"""
        self.clinical_findings.append({
            "finding": finding,
            "timestamp": datetime.now()
        })
    
    def get_context(self) -> dict:
        """Get current conversation context"""
        return {
            "clinical_findings": [f["finding"] for f in self.clinical_findings],
            "differential_diagnoses": self.differential_diagnoses,
            "current_diagnosis": self.current_diagnosis,
            "red_flags": self.red_flags,
            "recent_messages": self.messages[-3:] if self.messages else []
        }

class DoctorNotes(BaseModel):
    """Structure for doctor's notes"""
    physical_exam: str = ""
    clinical_notes: str = ""
    potential_diagnosis: str = ""

class Query(BaseModel):
    """Structure for medical queries"""
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
    """Structure for API responses"""
    answer: str

class DiagnosisAnalysisRequest(BaseModel):
    """Structure for diagnosis analysis requests"""
    diagnosis: str
    symptoms: List[str]
    patient_data: Dict[str, Any]

def setup_gemini():
    """Initialize Gemini AI model"""
    return genai.GenerativeModel(model_name="gemini-2.0-flash-exp")

def generate_prompt(query: Query, context: dict) -> str:
    """Generate a focused prompt for clinical discussion"""
    
    base_prompt = """You are an advanced AI medical assistant supporting healthcare professionals. Provide concise, evidence-based responses while maintaining professional standards.

Core Guidelines:
- Provide focused, evidence-based answers
- Use appropriate medical terminology
- Highlight critical safety concerns
- Support clinical decision-making
- Maintain professional boundaries

Remember:
- You are a support tool, not a replacement for clinical judgment
- Flag emergencies and critical findings immediately
- Acknowledge limitations when appropriate
- Defer to clinical judgment in complex cases

Required Context:"""

    # Add patient demographics and clinical context
    if query.patient_data:
        relevant_fields = {
            "age": "Age",
            "gender": "Gender",
            "chief_complaint": "Chief Complaint",
            "vital_signs": "Vitals",
            "medical_history": "History",
            "current_medications": "Medications",
            "allergies": "Allergies",
            "lab_results": "Labs"
        }
        
        context_data = {k: v for k, v in query.patient_data.items() 
                       if k in relevant_fields and v}
        
        if context_data:
            base_prompt += "\nPatient Information:\n"
            for key, value in context_data.items():
                base_prompt += f"- {relevant_fields[key]}: {value}\n"

    # Add current symptoms
    if query.symptoms:
        base_prompt += "\nCurrent Symptoms:\n"
        for symptom in query.symptoms:
            base_prompt += f"- {symptom}\n"

    # Add the specific query
    base_prompt += f"\nClinical Question: {query.question}\n"

    # Add response instruction
    base_prompt += """
Provide a direct, evidence-based answer addressing only the specific question asked.
Include only relevant clinical considerations and critical safety concerns."""

    return base_prompt

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
    """Process medical queries with enhanced prompting"""
    try:
        # Get or create context
        context = conversation_contexts.get(query.conversation_id)
        if not context:
            context = ConversationManager()
            conversation_contexts[query.conversation_id] = context

        try:
            # Generate appropriate prompt based on query type
            if "diagnosis" in query.question.lower():
                prompt = PromptGenerator.generate_diagnosis_prompt(
                    query.symptoms,
                    query.patient_data
                )
            elif "treatment" in query.question.lower():
                prompt = PromptGenerator.generate_treatment_prompt(
                    context.current_diagnosis,
                    query.patient_data
                )
            else:
                prompt = generate_prompt(query, context.get_context())

            # Validate prompt quality
            if not PromptQualityChecker.validate_prompt(prompt):
                prompt = PromptQualityChecker.enhance_prompt(prompt)

            # Store the generated prompt
            global last_generated_prompt
            last_generated_prompt = prompt

            # Get AI response
            model = setup_gemini()
            response = model.generate_content(
                prompt,
                generation_config={
                    "temperature": 0.7,
                    "max_output_tokens": 1024,
                }
            )

            if not response or not response.text:
                raise HTTPException(
                    status_code=500,
                    detail="No response generated from the AI model"
                )

            # Update context with new information
            context.add_message(query.question, "user")
            context.add_message(response.text, "assistant")

            # Extract and store relevant information
            diagnoses = ResponseParser.extract_diagnoses(response.text)
            red_flags = ResponseParser.extract_red_flags(response.text)
            
            for diagnosis in diagnoses:
                context.add_clinical_finding(diagnosis)
            
            return Response(answer=response.text)

        except Exception as e:
            print(f"Error during prompt generation or AI response: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error processing request: {str(e)}"
            )
    
    except Exception as e:
        print(f"Critical error in medical information processing: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Service temporarily unavailable. Please try again."
        )

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
    """Predict potential diseases based on patient data"""
    try:
        model = setup_gemini()
        
        prompt = f"""As an AI medical assistant, analyze the following patient information and provide a structured assessment of potential diseases. Format your response strictly as follows:

# Potential Diagnoses
For each diagnosis (maximum 5), provide:
- Condition name followed by a brief explanation
Do not use markdown formatting symbols (* or **) in the response.

# Recommendations
Please organize recommendations into these categories:

## Immediate Tests
- List urgent or immediate diagnostic tests needed

## Laboratory Tests
- List relevant blood work and other laboratory investigations

## Imaging Studies
- List any recommended imaging studies

## Specialist Referrals
- List any specialist consultations recommended

Patient Information:
Age: {data.get('age', 'Not specified')}
Gender: {data.get('gender', 'Not specified')}
Current Symptoms: {', '.join(data.get('symptoms', []))}
Medical History: {data.get('medical_history', 'None provided')}
Vital Signs: {data.get('vital_signs', 'Not available')}
Current Medications: {data.get('current_medications', 'None listed')}

Note: Ensure recommendations are specific and clinically relevant. Do not use markdown formatting symbols in the response.
"""

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
    """Analyze a specific diagnosis"""
    try:
        model = setup_gemini()
        
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
"""

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

@app.get("/last-prompt")
async def get_last_prompt():
    """Retrieve the last generated prompt"""
    return {"prompt": last_generated_prompt}

# Include routers
app.include_router(research.router, tags=["research"])
app.include_router(patients.router, tags=["patients"])

class PromptGenerator:
    @staticmethod
    def _format_patient_data(patient_data: dict) -> str:
        """Format patient data into a readable string"""
        formatted_data = []
        for key, value in patient_data.items():
            if value:
                formatted_key = key.replace('_', ' ').title()
                formatted_data.append(f"- **{formatted_key}**: {value}")
        return "\n".join(formatted_data)

    @staticmethod
    def _format_symptoms(symptoms: List[str]) -> str:
        """Format symptoms list into a readable string"""
        if not symptoms:
            return "No symptoms reported"
        return "\n".join([f"- {symptom}" for symptom in symptoms])

    @staticmethod
    def generate_diagnosis_prompt(symptoms: List[str], patient_data: dict) -> str:
        """Generate a prompt specifically for diagnosis analysis"""
        return f"""As an AI clinical assistant, analyze the following presentation and provide a structured differential diagnosis.

### Patient Information:
{PromptGenerator._format_patient_data(patient_data)}

### Presenting Symptoms:
{PromptGenerator._format_symptoms(symptoms)}

Please provide:
1. Primary differential diagnoses (most likely to least likely)
2. Key supporting factors for each diagnosis
3. Recommended workup/investigations
4. Red flags to consider
5. Suggested immediate actions

Format your response using markdown with clear sections."""

    @staticmethod
    def generate_treatment_prompt(diagnosis: str, patient_data: dict) -> str:
        """Generate a prompt for treatment recommendations"""
        return f"""Based on the diagnosis of {diagnosis}, provide evidence-based treatment recommendations.

### Patient Context:
{PromptGenerator._format_patient_data(patient_data)}

Please provide:
1. First-line treatment options
2. Alternative approaches if needed
3. Monitoring parameters
4. Expected outcomes
5. Follow-up recommendations
6. Patient education points

Consider patient-specific factors and contraindications."""

    @staticmethod
    def generate_lab_interpretation_prompt(lab_results: str, patient_context: dict) -> str:
        """Generate a prompt for lab result interpretation"""
        return f"""Interpret the following laboratory results in the context of this patient's presentation.

### Lab Results:
{lab_results}

### Patient Context:
{PromptGenerator._format_patient_data(patient_context)}

Please provide:
1. Interpretation of significant findings
2. Clinical correlation
3. Recommendations for additional testing if needed
4. Monitoring recommendations"""

class PromptTemplates:
    DIAGNOSIS_TEMPLATE = Template("""
You are analyzing a clinical case with the following information:

### Patient Demographics
- Age: ${age}
- Gender: ${gender}
- Chief Complaint: ${chief_complaint}

### Vital Signs
${vital_signs}

### Current Symptoms
${symptoms}

### Medical History
${medical_history}

Based on this information, please provide:
1. Differential diagnosis (ordered by likelihood)
2. Key supporting features for each diagnosis
3. Recommended initial workup
4. Red flags to watch for
5. Suggested immediate actions

Use markdown formatting for clarity and structure.
""")

    FOLLOW_UP_TEMPLATE = Template("""
Regarding the patient with:
- Previous Diagnosis: ${diagnosis}
- Treatment Plan: ${treatment}
- Time Since Last Visit: ${time_elapsed}

Current Status:
${current_status}

Please provide:
1. Assessment of treatment response
2. Recommended adjustments if needed
3. Follow-up planning
4. Patient education points
""")

class ResponseParser:
    @staticmethod
    def extract_diagnoses(response: str) -> List[str]:
        """Extract diagnoses from AI response using markdown parsing"""
        diagnoses = []
        try:
            # Split response into lines and look for diagnosis sections
            lines = response.split('\n')
            in_diagnosis_section = False
            
            for line in lines:
                if any(header in line.lower() for header in 
                      ['diagnosis:', 'differential diagnosis:', 'assessment:']):
                    in_diagnosis_section = True
                    continue
                    
                if in_diagnosis_section and line.strip().startswith('-'):
                    # Extract diagnosis from bullet point
                    diagnosis = line.strip('- ').split(':')[0].strip()
                    diagnoses.append(diagnosis)
                    
                if in_diagnosis_section and line.strip().startswith('#'):
                    # End of diagnosis section
                    break
                    
        except Exception as e:
            print(f"Error extracting diagnoses: {str(e)}")
            
        return diagnoses

    @staticmethod
    def extract_red_flags(response: str) -> List[str]:
        """Extract red flags and warnings from AI response"""
        red_flags = []
        try:
            lines = response.split('\n')
            in_red_flags_section = False
            
            for line in lines:
                if any(header in line.lower() for header in 
                      ['red flags:', 'warnings:', 'caution:']):
                    in_red_flags_section = True
                    continue
                    
                if in_red_flags_section and line.strip().startswith('-'):
                    # Extract red flag from bullet point
                    red_flag = line.strip('- ').strip()
                    red_flags.append(red_flag)
                    
                if in_red_flags_section and line.strip().startswith('#'):
                    # End of red flags section
                    break
                    
        except Exception as e:
            print(f"Error extracting red flags: {str(e)}")
            
        return red_flags

    @staticmethod
    def extract_recommendations(response: str) -> List[str]:
        """Extract recommendations from AI response"""
        recommendations = []
        # Implementation to parse markdown sections and extract recommendations
        return recommendations

class PromptQualityChecker:
    @staticmethod
    def validate_prompt(prompt: str) -> bool:
        """Validate prompt quality and completeness"""
        required_sections = [
            "Patient Overview",
            "Current Symptoms",
            "Medical History"
        ]
        
        for section in required_sections:
            if section not in prompt:
                return False
        
        return True

    @staticmethod
    def enhance_prompt(prompt: str) -> str:
        """Add missing elements to improve prompt quality"""
        # Add missing sections or context as needed
        return prompt

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)