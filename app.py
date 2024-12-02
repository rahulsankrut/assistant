import os
from typing import Dict, List
import google.generativeai as genai
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
from fastapi.middleware.cors import CORSMiddleware


class Query(BaseModel):
    question: str
    medical_history: Dict[str, str] = {}
    symptoms: List[str] = []

class Response(BaseModel):
    answer: str
    disclaimer: str
    follow_up_questions: List[str]

app = FastAPI(title="Medical Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def setup_gemini():
    """Initialize the Gemini API with safety settings"""
    try:
        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
        
        # Configure safety settings
        safety_settings = [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        ]
        
        model = genai.GenerativeModel('gemini-pro', safety_settings=safety_settings)
        return model
    except Exception as e:
        raise Exception(f"Failed to initialize Gemini: {str(e)}")

def generate_prompt(query: Query) -> str:
    """Generate a structured prompt for the LLM"""
    prompt = f"""You are a medical information assistant. Provide a clear, structured response with:
1. A detailed answer to the medical query
2. A clear medical disclaimer
3. 2-3 relevant follow-up questions

Question: {query.question}

"""
    if query.medical_history:
        prompt += "\nRelevant Medical History:\n"
        for condition, details in query.medical_history.items():
            prompt += f"- {condition}: {details}\n"
    
    if query.symptoms:
        prompt += "\nCurrent Symptoms:\n"
        for symptom in query.symptoms:
            prompt += f"- {symptom}\n"
            
    prompt += """\nResponse Format:
Answer:
[Detailed medical information]

Disclaimer:
[Important medical disclaimer]

Follow-up Questions:
1. [Question 1]
2. [Question 2]
3. [Question 3]"""
    
    return prompt

@app.post("/ask", response_model=Response)
async def get_medical_information(query: Query):
    """Process medical queries and return structured responses"""
    try:
        model = setup_gemini()
        prompt = generate_prompt(query)
        
        response = model.generate_content(prompt)
        
        # Default response structure
        processed_response = {
            "answer": response.text or "I couldn't generate a specific response.",
            "disclaimer": "This is for informational purposes only. Always consult with healthcare professionals for medical advice.",
            "follow_up_questions": []
        }
        
        # Try to parse the response more explicitly
        try:
            # Split the response into sections
            sections = response.text.split('\n\n')
            
            # Look for specific sections
            for section in sections:
                if section.lower().startswith('answer:'):
                    processed_response['answer'] = section.replace('Answer:', '').strip()
                elif section.lower().startswith('disclaimer:'):
                    processed_response['disclaimer'] = section.replace('Disclaimer:', '').strip()
                elif section.lower().startswith('follow-up questions:'):
                    # Extract follow-up questions
                    questions = [q.strip() for q in section.split('\n')[1:] if q.strip()]
                    processed_response['follow_up_questions'] = questions
        except Exception as parse_error:
            print(f"Parsing error: {parse_error}")
        
        return Response(**processed_response)
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)