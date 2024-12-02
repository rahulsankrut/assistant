"use client";

import React, { useState } from 'react';

const MedicalChat = () => {
  interface Message {
    type: 'user' | 'assistant' | 'error';
    content: string;
    disclaimer?: string;
    followUp?: string[];
  }
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [symptomInput, setSymptomInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!input.trim()) return;
    
    setIsLoading(true);
    setMessages([...messages, { type: 'user', content: input }]);

    try {
      const response = await fetch('http://localhost:8000/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          question: input,
          symptoms,
          medical_history: {}  // Add this if you're not using medical history
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Response data:', data);  // Add this to debug
      
      setMessages(prev => [...prev, {
        type: 'assistant',
        content: data.answer,
        disclaimer: data.disclaimer,
        followUp: data.follow_up_questions
      }]);
    } catch (error) {
      console.error('Error:', error);  // Add this to debug
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white shadow-lg rounded-lg p-6 border border-gray-200">
          <h1 className="text-2xl font-bold mb-4 text-indigo-700 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
            Medical Assistant
          </h1>
          
          {/* Symptoms Input */}
          <div className="mb-6">
            <h3 className="font-medium mb-2 text-gray-700">Current Symptoms</h3>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Add symptom"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={symptomInput}
                onChange={(e) => setSymptomInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSymptom()}
              />
              <button 
                onClick={addSymptom}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {symptoms.map((symptom, index) => (
                <span key={index} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm">
                  {symptom}
                </span>
              ))}
            </div>
          </div>

          {/* Chat Messages */}
          <div className="h-96 overflow-y-auto mb-6 space-y-4 border border-gray-200 rounded-lg p-4 bg-gray-50">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg shadow-sm ${
                  message.type === 'user' 
                    ? 'bg-indigo-50 ml-auto max-w-[80%] border border-indigo-100' 
                    : message.type === 'error'
                    ? 'bg-red-50 border border-red-100 text-red-700'
                    : 'bg-white max-w-[80%] border border-gray-200'
                }`}
              >
                <div className={message.type === 'user' ? 'text-indigo-700' : 'text-gray-700'}>
                  {message.content}
                </div>
                {message.disclaimer && (
                  <div className="text-sm text-gray-500 mt-2 border-t border-gray-200 pt-2">
                    {message.disclaimer}
                  </div>
                )}
                {message.followUp && message.followUp.length > 0 && (
                  <div className="mt-3 border-t border-gray-200 pt-2">
                    <div className="font-medium text-gray-700">Follow-up questions:</div>
                    <ul className="mt-1 space-y-1">
                      {message.followUp.map((q, i) => (
                        <li key={i} className="text-sm text-gray-600">• {q}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Type your medical question..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
            />
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className={`px-6 py-3 rounded-lg transition-colors duration-200 ${
                isLoading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {isLoading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicalChat;