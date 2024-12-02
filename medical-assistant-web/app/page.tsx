"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8">
      <div className="max-w-5xl mx-auto p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-lg shadow-2xl rounded-3xl p-8 border border-white/20"
        >
          <div className="flex items-center justify-between mb-8">
            <motion.h1 
              initial={{ x: -20 }}
              animate={{ x: 0 }}
              className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text"
            >
              AI Medical Assistant
            </motion.h1>
            {isLoading && (
              <div className="flex space-x-2">
                <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce"></div>
              </div>
            )}
          </div>

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
                className="flex-1 px-4 py-3 rounded-xl border-2 border-indigo-100 
                  focus:border-indigo-300 focus:ring focus:ring-indigo-200 
                  focus:ring-opacity-50 transition-all duration-300
                  text-gray-700 bg-white shadow-inner"
                value={symptomInput}
                onChange={(e) => setSymptomInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSymptom()}
              />
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={addSymptom}
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 
                  text-white rounded-xl hover:shadow-lg transition-all duration-300
                  font-medium"
              >
                Add
              </motion.button>
            </div>
            <motion.div 
              layout
              className="flex flex-wrap gap-2"
            >
              {symptoms.map((symptom, index) => (
                <motion.span 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  key={index}
                  className="px-4 py-2 bg-white rounded-full text-indigo-700 
                    shadow-sm hover:shadow-md transition-all duration-300 
                    cursor-pointer border border-indigo-100 flex items-center gap-2"
                  onClick={() => setSymptoms(symptoms.filter((_, i) => i !== index))}
                >
                  {symptom}
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-indigo-400 hover:text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0h-6m6 0h-6m-3-4h-6M4 16h16M4 12h16M4 8h16M3 4h18M4 20h16M4 18h16M5 14h14M6 10h12M7 6h10M8 2v2M7 20h10M14 18h2.343c.037.04.079.078.125.115l2.121 2.121a1 1 0 01.424.849V19a2 2 0 01-2 2h-1C9.716 21 8.5 20.732 7.462 20.268c-1.044.462-2.37.693-3.946.693C3.339 21 2 19.661 2 18c0-1.661 1.339-3 3-3h.256c.147.404.37.767.644 1.078l1.51 1.99M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </motion.span>
              ))}
            </motion.div>
          </div>

          <div className="h-[500px] overflow-y-auto mb-6 space-y-4 p-6 
            bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100
            scrollbar-thin scrollbar-thumb-indigo-300 scrollbar-track-transparent">
            {messages.map((message, index) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                key={index}
                className={`p-6 rounded-2xl shadow-md ${
                  message.type === 'user' 
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 ml-auto max-w-[80%] text-white' 
                    : 'bg-white max-w-[80%] border border-indigo-100'
                }`}
              >
                <div className={message.type === 'user' ? 'text-white' : 'text-gray-700'}>
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
                    <ul className="mt-2 space-y-2">
                      {message.followUp.map((q, i) => (
                        <li 
                          key={i} 
                          className="text-sm text-indigo-600 hover:text-indigo-700 cursor-pointer bg-indigo-50 p-2 rounded-lg hover:bg-indigo-100 transition-colors duration-200"
                          onClick={() => setInput(q)}
                        >
                          → {q}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-2xl shadow-lg">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Type your medical question..."
                className="flex-1 px-6 py-4 rounded-xl border-2 border-indigo-100 
                  focus:border-indigo-300 focus:ring focus:ring-indigo-200 
                  focus:ring-opacity-50 transition-all duration-300
                  text-gray-700 bg-white shadow-inner"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSubmit}
                disabled={isLoading}
                className={`px-8 py-4 rounded-xl transition-all duration-300 
                  flex items-center gap-2 font-medium shadow-lg
                  ${isLoading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-xl text-white'
                  }`}
              >
                {isLoading ? 'Sending...' : 'Send'}
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default MedicalChat;