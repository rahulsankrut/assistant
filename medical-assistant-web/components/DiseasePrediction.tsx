import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Patient } from '../types/patient';
import ReactMarkdown from 'react-markdown';

interface DiseasePredictionProps {
  patientData: Patient;
  symptoms: string[];
}

const DiseasePrediction: React.FC<DiseasePredictionProps> = ({ patientData, symptoms }) => {
  const [prediction, setPrediction] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkedRecommendations, setCheckedRecommendations] = useState<Set<number>>(new Set());
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<string | null>(null);
  const [diagnosisAnalysis, setDiagnosisAnalysis] = useState<string>('');
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [expandedLikelihoods, setExpandedLikelihoods] = useState<Set<number>>(new Set());

  useEffect(() => {
    setPrediction('');
    setError(null);
    setCheckedRecommendations(new Set());
    setSelectedDiagnosis(null);
    setDiagnosisAnalysis('');
    setExpandedLikelihoods(new Set());
  }, [patientData.id, symptoms.join(',')]);

  const getPrediction = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/predict-diseases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          age: patientData.age,
          gender: patientData.gender,
          symptoms: symptoms,
          medical_history: patientData.medical_history,
          vital_signs: patientData.vital_signs,
          current_medications: patientData.current_medications,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get prediction');
      }

      const data = await response.json();
      setPrediction(data.prediction);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const getDiagnosisAnalysis = async (diagnosis: string) => {
    setIsAnalysisLoading(true);
    try {
      const response = await fetch('http://localhost:8000/analyze-diagnosis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          diagnosis,
          symptoms,
          patient_data: patientData,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get diagnosis analysis');
      }

      const data = await response.json();
      setDiagnosisAnalysis(data.analysis);
      setSelectedDiagnosis(diagnosis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get diagnosis analysis');
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  const formatPredictionSection = (text: string) => {
    const sections = {
      diagnoses: [] as { name: string; explanation: string }[],
      recommendations: {
        immediate: [] as string[],
        laboratory: [] as string[],
        imaging: [] as string[],
        referrals: [] as string[],
      }
    };

    let currentSection = '';
    let currentRecommendationType = '';
    const lines = text.split('\n');

    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      if (trimmedLine.startsWith('# ')) {
        if (trimmedLine.toLowerCase().includes('diagnos')) {
          currentSection = 'diagnoses';
          currentRecommendationType = '';
        } else if (trimmedLine.toLowerCase().includes('recommend')) {
          currentSection = 'recommendations';
          currentRecommendationType = '';
        }
      } else if (trimmedLine.startsWith('## ')) {
        if (trimmedLine.toLowerCase().includes('immediate')) {
          currentRecommendationType = 'immediate';
        } else if (trimmedLine.toLowerCase().includes('laboratory')) {
          currentRecommendationType = 'laboratory';
        } else if (trimmedLine.toLowerCase().includes('imaging')) {
          currentRecommendationType = 'imaging';
        } else if (trimmedLine.toLowerCase().includes('referral')) {
          currentRecommendationType = 'referrals';
        }
      } else if (trimmedLine.startsWith('-')) {
        if (currentSection === 'diagnoses') {
          const diagnosisText = trimmedLine.substring(1).trim();
          const [name, ...explanationParts] = diagnosisText.split('-');
          const explanation = explanationParts.join('-').trim();
          if (name) {
            sections.diagnoses.push({ 
              name: name.trim(), 
              explanation: explanation.trim()
            });
          }
        } else if (currentSection === 'recommendations' && currentRecommendationType) {
          sections.recommendations[currentRecommendationType as keyof typeof sections.recommendations]
            .push(trimmedLine.substring(1).trim());
        }
      }
    });

    return sections;
  };

  return (
    <div className="bg-white rounded-3xl shadow-xl p-6 border border-indigo-100">
      <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-transparent bg-clip-text mb-6">
        Disease Prediction Analysis
      </h2>

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-indigo-700 mb-2">Current Patient Data:</h3>
        <div className="bg-indigo-50 rounded-xl p-4 space-y-2 text-gray-700">
          <p><span className="font-medium text-indigo-900">Age:</span> {patientData.age}</p>
          <p><span className="font-medium text-indigo-900">Gender:</span> {patientData.gender}</p>
          <p><span className="font-medium text-indigo-900">Current Symptoms:</span> {symptoms.join(', ') || 'None recorded'}</p>
          <p><span className="font-medium text-indigo-900">Medical History:</span> {patientData.medical_history || 'None recorded'}</p>
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={getPrediction}
        disabled={isLoading}
        className={`
          w-full py-3 rounded-xl
          font-medium transition-all duration-300
          flex items-center justify-center gap-2
          ${isLoading 
            ? 'bg-gray-300 text-gray-600 cursor-not-allowed opacity-75' 
            : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:from-indigo-700 hover:to-purple-700'
          }
        `}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Analyzing...
          </>
        ) : (
          'Generate Disease Prediction'
        )}
      </motion.button>

      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100">
          {error}
        </div>
      )}

      {prediction && !error && (
        <div className="mt-6 space-y-6">
          {/* Potential Diagnoses */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-indigo-100">
            <h3 className="text-xl font-semibold text-indigo-700 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Top Potential Diagnoses
            </h3>
            <div className="space-y-4">
              {formatPredictionSection(prediction).diagnoses.slice(0, 5).map((diagnosis, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`
                    flex items-start gap-4 p-4 rounded-xl transition-all duration-300
                    ${selectedDiagnosis === diagnosis.name 
                      ? 'bg-indigo-100 border-2 border-indigo-400' 
                      : 'bg-indigo-50/50 hover:bg-indigo-100/50 border border-indigo-100'
                    }
                    cursor-pointer
                  `}
                  onClick={() => getDiagnosisAnalysis(diagnosis.name)}
                >
                  <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-indigo-600 text-white font-semibold">
                    {isAnalysisLoading && selectedDiagnosis === diagnosis.name ? (
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  <div className="flex-grow">
                    <div className="font-medium text-lg text-indigo-900 mb-1">
                      {diagnosis.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {diagnosis.explanation}
                    </div>
                    {selectedDiagnosis === diagnosis.name && (
                      <div className="text-sm text-indigo-600 mt-2">
                        Click for detailed analysis
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-transform duration-300 ${
                      selectedDiagnosis === diagnosis.name ? 'rotate-90 text-indigo-600' : 'text-indigo-400'
                    }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-indigo-100">
            <h3 className="text-xl font-semibold text-indigo-700 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Recommended Tests & Examinations
            </h3>
            
            {/* Immediate Tests */}
            {formatPredictionSection(prediction).recommendations.immediate.length > 0 && (
              <div className="mb-4">
                <h4 className="text-md font-medium text-indigo-600 mb-2">Immediate Tests</h4>
                <div className="space-y-2">
                  {formatPredictionSection(prediction).recommendations.immediate.map((rec, index) => (
                    <div key={index} className="p-3 bg-red-50 rounded-lg text-gray-700 flex items-start gap-3">
                      <div className="flex-shrink-0 w-1.5 h-1.5 mt-2 rounded-full bg-red-500" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Laboratory Tests */}
            {formatPredictionSection(prediction).recommendations.laboratory.length > 0 && (
              <div className="mb-4">
                <h4 className="text-md font-medium text-indigo-600 mb-2">Laboratory Tests</h4>
                <div className="space-y-2">
                  {formatPredictionSection(prediction).recommendations.laboratory.map((rec, index) => (
                    <div key={index} className="p-3 bg-blue-50 rounded-lg text-gray-700 flex items-start gap-3">
                      <div className="flex-shrink-0 w-1.5 h-1.5 mt-2 rounded-full bg-blue-500" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Imaging Studies */}
            {formatPredictionSection(prediction).recommendations.imaging.length > 0 && (
              <div className="mb-4">
                <h4 className="text-md font-medium text-indigo-600 mb-2">Imaging Studies</h4>
                <div className="space-y-2">
                  {formatPredictionSection(prediction).recommendations.imaging.map((rec, index) => (
                    <div key={index} className="p-3 bg-purple-50 rounded-lg text-gray-700 flex items-start gap-3">
                      <div className="flex-shrink-0 w-1.5 h-1.5 mt-2 rounded-full bg-purple-500" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Specialist Referrals */}
            {formatPredictionSection(prediction).recommendations.referrals.length > 0 && (
              <div className="mb-4">
                <h4 className="text-md font-medium text-indigo-600 mb-2">Specialist Referrals</h4>
                <div className="space-y-2">
                  {formatPredictionSection(prediction).recommendations.referrals.map((rec, index) => (
                    <div key={index} className="p-3 bg-green-50 rounded-lg text-gray-700 flex items-start gap-3">
                      <div className="flex-shrink-0 w-1.5 h-1.5 mt-2 rounded-full bg-green-500" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DiseasePrediction; 