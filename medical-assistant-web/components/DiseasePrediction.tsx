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
      diagnoses: [] as string[],
      likelihoods: [] as string[],
      supportingFactors: [] as string[],
      recommendations: [] as string[],
    };

    let currentSection = '';
    const lines = text.split('\n');

    lines.forEach(line => {
      const trimmedLine = line.trim().toLowerCase();
      
      if (trimmedLine.includes('diagnos')) {
        currentSection = 'diagnoses';
      } else if (trimmedLine.includes('likelihood')) {
        currentSection = 'likelihoods';
      } else if (trimmedLine.includes('supporting factor')) {
        currentSection = 'supportingFactors';
      } else if (trimmedLine.includes('recommend')) {
        currentSection = 'recommendations';
      } else if (trimmedLine) {
        if (currentSection) {
          const isListItem = /^[-•*]|\d+[\.)]\s*/.test(trimmedLine);
          const cleanedLine = isListItem 
            ? trimmedLine.replace(/^[-•*]|\d+[\.)]\s*/, '').trim()
            : trimmedLine;
            
          if (cleanedLine && !cleanedLine.match(/^[.:,\s]+$/)) {
            sections[currentSection as keyof typeof sections].push(cleanedLine);
          }
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
            <h3 className="text-lg font-semibold text-indigo-700 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              Top 5 Potential Diagnoses
            </h3>
            <div className="space-y-4">
              {/* Diagnosis List */}
              <div className="space-y-2">
                {formatPredictionSection(prediction).diagnoses.slice(0, 5).map((diagnosis, index) => (
                  <div 
                    key={index} 
                    className="flex items-start gap-3 p-3 rounded-lg bg-indigo-50 cursor-pointer hover:bg-indigo-100 transition-colors"
                    onClick={() => getDiagnosisAnalysis(diagnosis)}
                  >
                    <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-semibold">
                      {index + 1}
                    </div>
                    <div className="flex-grow">
                      <ReactMarkdown
                        className="prose prose-indigo max-w-none"
                        components={{
                          p: ({node, ...props}) => (
                            <span className="block text-gray-700" {...props} />
                          ),
                          strong: ({node, ...props}) => (
                            <strong className="font-semibold text-indigo-900" {...props} />
                          ),
                          em: ({node, ...props}) => (
                            <em className="text-indigo-800 not-italic font-medium" {...props} />
                          ),
                          ul: ({node, ...props}) => (
                            <ul className="list-disc pl-4 mt-1 space-y-1" {...props} />
                          ),
                          li: ({node, ...props}) => (
                            <li className="text-gray-700" {...props} />
                          ),
                          a: ({node, ...props}) => (
                            <a className="text-indigo-600 hover:text-indigo-800 underline" {...props} />
                          ),
                          code: ({node, ...props}) => (
                            <code className="px-1 py-0.5 bg-indigo-100 rounded text-indigo-800 text-sm" {...props} />
                          ),
                          blockquote: ({node, ...props}) => (
                            <blockquote className="border-l-4 border-indigo-300 pl-3 my-1 text-gray-600 italic" {...props} />
                          ),
                        }}
                      >
                        {diagnosis}
                      </ReactMarkdown>
                    </div>
                    <div className="flex-shrink-0 text-indigo-600 hover:text-indigo-800 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>

              {/* Selected Diagnosis Analysis */}
              {selectedDiagnosis && (
                <div className="mt-6 p-4 bg-white rounded-xl border border-indigo-200 shadow-inner">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-indigo-800">
                      Detailed Analysis: {selectedDiagnosis}
                    </h4>
                    <button
                      onClick={() => setSelectedDiagnosis(null)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  
                  {isAnalysisLoading ? (
                    <div className="flex items-center justify-center p-4">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                    </div>
                  ) : (
                    <div className="prose prose-indigo max-w-none">
                      <ReactMarkdown
                        className="markdown-content"
                        components={{
                          h2: ({node, ...props}) => (
                            <h2 className="text-xl font-semibold text-indigo-700 mt-6 mb-3" {...props} />
                          ),
                          h3: ({node, ...props}) => (
                            <h3 className="text-lg font-medium text-indigo-600 mt-4 mb-2" {...props} />
                          ),
                          ul: ({node, ...props}) => (
                            <ul className="list-disc pl-6 my-2" {...props} />
                          ),
                          li: ({node, ...props}) => (
                            <li className="text-gray-700 my-1" {...props} />
                          ),
                          p: ({node, ...props}) => (
                            <p className="text-gray-700 my-2" {...props} />
                          ),
                          blockquote: ({node, ...props}) => (
                            <blockquote className="border-l-4 border-indigo-500 pl-4 my-2 text-gray-600 bg-indigo-50 p-2 rounded" {...props} />
                          ),
                          strong: ({node, ...props}) => (
                            <strong className="font-semibold text-indigo-900" {...props} />
                          ),
                          em: ({node, ...props}) => (
                            <em className="text-indigo-800" {...props} />
                          ),
                        }}
                      >
                        {diagnosisAnalysis}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Likelihood Assessment */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-indigo-100">
            <h3 className="text-lg font-semibold text-indigo-700 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Likelihood Assessment
            </h3>
            <div className="space-y-3">
              {formatPredictionSection(prediction).likelihoods.map((likelihood, index) => {
                const likelihoodLevel = likelihood.toLowerCase();
                const isHigh = likelihoodLevel.includes('high');
                const isMedium = likelihoodLevel.includes('medium') || likelihoodLevel.includes('moderate');
                const isLow = likelihoodLevel.includes('low');
                const isExpanded = expandedLikelihoods.has(index);
                const supportingFactors = formatPredictionSection(prediction).supportingFactors[index];

                return (
                  <div 
                    key={index} 
                    className={`rounded-lg border ${
                      isHigh ? 'bg-red-50 border-red-200' :
                      isMedium ? 'bg-yellow-50 border-yellow-200' :
                      isLow ? 'bg-green-50 border-green-200' :
                      'bg-gray-50 border-gray-200'
                    } transition-all duration-300`}
                  >
                    <button 
                      className="w-full p-4 text-left"
                      onClick={() => {
                        setExpandedLikelihoods(prev => {
                          const newSet = new Set(prev);
                          if (newSet.has(index)) {
                            newSet.delete(index);
                          } else {
                            newSet.add(index);
                          }
                          return newSet;
                        });
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1">
                          {isHigh && (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-6 rounded-full bg-red-400"></div>
                              <div className="w-2 h-4 rounded-full bg-red-300"></div>
                              <div className="w-2 h-2 rounded-full bg-red-200"></div>
                            </div>
                          )}
                          {isMedium && (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-5 rounded-full bg-yellow-400"></div>
                              <div className="w-2 h-3 rounded-full bg-yellow-300"></div>
                            </div>
                          )}
                          {isLow && (
                            <div className="flex items-center gap-1">
                              <div className="w-2 h-3 rounded-full bg-green-400"></div>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <ReactMarkdown
                            className="text-gray-700"
                            components={{
                              p: ({node, ...props}) => (
                                <span className="block">{props.children}</span>
                              ),
                              strong: ({node, ...props}) => (
                                <strong className={`font-semibold ${
                                  isHigh ? 'text-red-700' :
                                  isMedium ? 'text-yellow-700' :
                                  isLow ? 'text-green-700' :
                                  'text-gray-700'
                                }`} {...props} />
                              ),
                              em: ({node, ...props}) => (
                                <em className={`${
                                  isHigh ? 'text-red-600' :
                                  isMedium ? 'text-yellow-600' :
                                  isLow ? 'text-green-600' :
                                  'text-gray-600'
                                }`} {...props} />
                              ),
                            }}
                          >
                            {likelihood}
                          </ReactMarkdown>
                        </div>
                        <div 
                          className="flex-shrink-0 text-gray-400 transition-transform duration-200"
                          style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </button>

                    {/* Supporting Factors */}
                    {isExpanded && supportingFactors && (
                      <div className="px-4 pb-4">
                        <div className="border-t border-gray-200 pt-3 space-y-2">
                          <h4 className="text-sm font-medium text-gray-600 mb-2">Supporting Factors:</h4>
                          <div className="prose prose-indigo max-w-none">
                            <ReactMarkdown
                              className="text-gray-700"
                              components={{
                                p: ({node, ...props}) => (
                                  <div className="flex items-start gap-2 py-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0"></span>
                                    <span>{props.children}</span>
                                  </div>
                                ),
                                strong: ({node, ...props}) => (
                                  <strong className="font-semibold text-indigo-900" {...props} />
                                ),
                                em: ({node, ...props}) => (
                                  <em className="text-indigo-800" {...props} />
                                ),
                              }}
                            >
                              {supportingFactors}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white rounded-xl p-6 shadow-md border border-indigo-100">
            <h3 className="text-lg font-semibold text-indigo-700 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Recommended Tests & Examinations
            </h3>
            <div className="space-y-2">
              {formatPredictionSection(prediction).recommendations.map((recommendation, index) => (
                <div key={index} className="flex items-start gap-2 p-2 bg-green-50 rounded-lg">
                  <label className="flex items-start gap-2 cursor-pointer w-full">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                      checked={checkedRecommendations.has(index)}
                      onChange={() => {
                        const newChecked = new Set(checkedRecommendations);
                        if (newChecked.has(index)) {
                          newChecked.delete(index);
                        } else {
                          newChecked.add(index);
                        }
                        setCheckedRecommendations(newChecked);
                      }}
                    />
                    <div className="flex-1">
                      <ReactMarkdown
                        className={`text-gray-700 ${checkedRecommendations.has(index) ? 'line-through text-gray-500' : ''}`}
                        components={{
                          p: ({node, ...props}) => (
                            <span className="block">{props.children}</span>
                          ),
                          strong: ({node, ...props}) => (
                            <strong className="font-semibold text-indigo-900" {...props} />
                          ),
                          em: ({node, ...props}) => (
                            <em className="text-indigo-800" {...props} />
                          ),
                        }}
                      >
                        {recommendation}
                      </ReactMarkdown>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="text-sm text-gray-500 italic border-t border-gray-200 pt-4">
            Note: This is an AI-generated assessment and should not replace professional medical diagnosis.
          </div>
        </div>
      )}
    </div>
  );
};

export default DiseasePrediction; 