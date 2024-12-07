# Remove the comments to test if the API key is working



import google.generativeai as genai

genai.configure(api_key="AIzaSyDv-LEWvPW3vuIhwdG52XxOD8VOotLhSbE")
model = genai.GenerativeModel("gemini-1.5-flash")
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