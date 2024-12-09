# AI Medical Assistant

## Overview
AI Medical Assistant is a comprehensive web application that empowers healthcare professionals with AI-powered medical insights, research assistance, and patient management capabilities. The system combines advanced natural language processing with medical knowledge to provide reliable clinical support tools.

## Features

### Clinical Support 🩺
- Interactive AI chat interface for medical consultations and discussions
- Context-aware medical conversations with natural language understanding
- Hands-free speech-to-text input for efficient symptom recording and note-taking
- Real-time clinical decision support

### Disease Analysis 🔬
- AI-powered disease probability assessment using machine learning models
- Comprehensive risk analysis based on patient health data and symptoms
- Evidence-based recommendations and clinical insights
- Visualization of risk factors and potential outcomes

### Medical Research Assistant 📚
- Intelligent medical literature search across multiple databases
- Research paper analysis and key findings extraction
- AI-facilitated research discussions and paper summarization
- Citation management and organization

## Technology Stack

### Frontend
- Next.js 14 with App Router
- React 18 with Hooks
- TypeScript for type safety
- Tailwind CSS for styling
- Framer Motion for animations

### Backend
- FastAPI for high-performance API endpoints
- Google Gemini AI for medical analysis
- MongoDB for secure patient data storage
- Python 3.9+ runtime environment

## Getting Started

### Prerequisites
- Node.js (version 18 or higher)
- Python (version 3.9 or higher)
- MongoDB (latest stable version)
- Google AI API credentials

### Frontend Installation
```bash
# Clone the repository
git clone https://github.com/rahulsankrut/medical-assistant-web.git

# Navigate to frontend directory
cd medical-assistant-web

# Install dependencies
npm install

# Start development server
npm run dev
```

### Backend Installation
```bash
# Navigate to backend directory
cd backend/app

# Create virtual environment
python -m venv venv

# Activate virtual environment
# For Unix/macOS:
source venv/bin/activate
# For Windows:
venv\Scripts\activate

# Install required packages
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env with your credentials

# Launch backend server
uvicorn app:app --reload
```

## Configuration

### Required Environment Variables
```
GOOGLE_API_KEY=your_google_ai_api_key
MONGODB_URI=your_mongodb_connection_string
PORT=backend_server_port
```

## Application Architecture

### Core Components
- `app/page.tsx`: Main clinical interface and chat implementation
- `components/DiseasePrediction.tsx`: Disease analysis and risk assessment module
- `components/MedicalResearch.tsx`: Literature search and research assistant
- `backend/app/app.py`: FastAPI server and API endpoint definitions

### AI Capabilities
- Natural language medical conversations
- Patient data analysis and pattern recognition
- Evidence-based disease probability assessment
- Intelligent medical literature search and analysis
- Markdown-formatted clinical documentation

## Contributing

We welcome contributions to improve the AI Medical Assistant! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/NewFeature`)
3. Make your changes
4. Commit (`git commit -m 'Add NewFeature'`)
5. Push to the branch (`git push origin feature/NewFeature`)
6. Open a Pull Request

## Contact

Rahul Kasanagottu  
Email: rahulsankrut@gmail.com  
Project Repository: [https://github.com/rahulsankrut/medical-assistant-web](https://github.com/rahulsankrut/medical-assistant-web)
