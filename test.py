# Remove the comments to test if the API key is working

import google.generativeai as genai

genai.configure(api_key="AIzaSyDv-LEWvPW3vuIhwdG52XxOD8VOotLhSbE")

generation_config = {
  "temperature": 1,
  "top_p": 0.95,
  "top_k": 40,
  "max_output_tokens": 8192,
  "response_mime_type": "text/plain",
}

model = genai.GenerativeModel(
  model_name="gemini-2.0-flash-exp",
  generation_config=generation_config,
  system_instruction="You are an AI clinical assistant engaging in an ongoing medical dialogue. \nFormat your response in markdown using:\n- **Bold** for important terms and emphasis\n- *Italics* for medical terminology\n- ### For section headers\n- Bullet points for lists\n- > For important warnings or notes\n- Code blocks for measurements or lab values\n\nContinue our discussion naturally, considering the conversation history.\nMaintain a professional yet conversational tone, as if we're colleagues discussing a case.\nFocus on addressing the current query while building on our previous discussion.",
)

response = model.generate_content("Explain how AI works")
print(response.text)



"""
import requests

query = {
    "question": "What are the common symptoms of the flu?",
    "medical_history": {
        "asthma": "Diagnosed 5 years ago",
    },
    "symptoms": ["fever", "cough"]
}

response = requests.post("http://localhost:8000/ask", json=query)
print(response.json())

"""