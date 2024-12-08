import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tab } from '@headlessui/react';
import ReactMarkdown from 'react-markdown';

interface ResearchPaper {
  title: string;
  link: string;
  authors: string;
  snippet: string;
  citations: string;
  abstract?: string;
  journal?: string;
  year?: string;
  doi?: string;
  keywords?: string[];
  methodology?: string;
  conclusions?: string;
}

interface SearchResult {
  papers: ResearchPaper[];
  total_results: number;
  start: number;
}

const MedicalResearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [activeTab, setActiveTab] = useState(0);
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [selectedPaper, setSelectedPaper] = useState<ResearchPaper | null>(null);

  const handleSearch = async (page: number = 0) => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setError(null);
    
    try {
      const response = await fetch(`http://localhost:8000/search-scholar?query=${encodeURIComponent(searchQuery)}&start=${page * 10}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch research papers');
      }
      
      const data = await response.json();
      setSearchResults(data);
      setCurrentPage(page);
    } catch (error) {
      console.error('Search error:', error);
      setError('Failed to fetch research papers. Please try again later.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const response = await fetch('http://localhost:8000/research-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          history: chatMessages,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      console.error('Chat error:', error);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again.'
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handlePaperClick = (paper: ResearchPaper, e: React.MouseEvent) => {
    e.preventDefault();
    setSelectedPaper(paper);
  };

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100 shadow-lg">
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Medical Research Assistant</h3>
        <p className="text-gray-600">Search and discuss medical literature using AI.</p>
      </div>

      <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
        <Tab.List className="flex space-x-2 mb-6 bg-white rounded-xl p-1 shadow-sm">
          <Tab className={({ selected }) => `
            w-full py-2.5 text-sm leading-5 font-medium rounded-lg
            focus:outline-none focus:ring-2 ring-offset-2 ring-offset-indigo-400 ring-white ring-opacity-60
            ${selected
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow'
              : 'text-gray-600 hover:bg-indigo-50'
            }
          `}>
            Search Literature
          </Tab>
          <Tab className={({ selected }) => `
            w-full py-2.5 text-sm leading-5 font-medium rounded-lg
            focus:outline-none focus:ring-2 ring-offset-2 ring-offset-indigo-400 ring-white ring-opacity-60
            ${selected
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow'
              : 'text-gray-600 hover:bg-indigo-50'
            }
          `}>
            Research Chat
          </Tab>
        </Tab.List>

        <Tab.Panels>
          <Tab.Panel>
            <div className="flex gap-4 mb-6">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search medical literature..."
                className="flex-1 px-4 py-3 rounded-xl border-2 border-indigo-100 
                  focus:border-indigo-300 focus:ring focus:ring-indigo-200 
                  focus:ring-opacity-50 transition-all duration-300
                  text-gray-700 bg-white shadow-inner"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch(0)}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSearch(0)}
                disabled={isSearching}
                className={`px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 
                  text-white rounded-xl hover:shadow-lg transition-all duration-300
                  font-medium flex items-center gap-2 ${isSearching ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isSearching ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin" />
                    Searching...
                  </div>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Search
                  </>
                )}
              </motion.button>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100">
                {error}
              </div>
            )}

            <AnimatePresence mode='wait'>
              {searchResults && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {searchResults.papers.map((paper, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 cursor-pointer"
                      onClick={(e) => handlePaperClick(paper, e)}
                    >
                      <h3 className="text-lg font-semibold text-indigo-600 hover:text-indigo-800 transition-colors duration-300">
                        {paper.title}
                      </h3>
                      <p className="text-sm text-gray-600 mt-2">{paper.authors}</p>
                      <p className="text-gray-700 mt-2">{paper.snippet}</p>
                      <p className="text-sm text-gray-500 mt-2">{paper.citations}</p>
                    </motion.div>
                  ))}

                  <div className="flex justify-between items-center mt-6">
                    <button
                      onClick={() => handleSearch(currentPage - 1)}
                      disabled={currentPage === 0 || isSearching}
                      className={`px-4 py-2 rounded-lg transition-colors duration-300 ${
                        currentPage === 0 || isSearching
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                      }`}
                    >
                      Previous
                    </button>
                    <span className="text-gray-600">Page {currentPage + 1}</span>
                    <button
                      onClick={() => handleSearch(currentPage + 1)}
                      disabled={searchResults.papers.length < 10 || isSearching}
                      className={`px-4 py-2 rounded-lg transition-colors duration-300 ${
                        searchResults.papers.length < 10 || isSearching
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Tab.Panel>

          <Tab.Panel>
            <div className="bg-white rounded-xl shadow-inner p-4 h-[500px] flex flex-col">
              <div className="flex-1 overflow-y-auto mb-4 space-y-4">
                {chatMessages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-xl p-4 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <ReactMarkdown
                        className={`prose ${message.role === 'user' ? 'prose-invert' : 'prose-indigo'} max-w-none`}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleChat} className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask about medical research..."
                  className="flex-1 px-4 py-3 rounded-xl border-2 border-indigo-100 
                    focus:border-indigo-300 focus:ring focus:ring-indigo-200 
                    focus:ring-opacity-50 transition-all duration-300
                    text-gray-700 bg-white shadow-inner"
                  disabled={isChatLoading}
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isChatLoading}
                  className={`
                    px-6 py-3 rounded-xl font-medium transition-all duration-300
                    flex items-center justify-center gap-2
                    ${isChatLoading 
                      ? 'bg-gray-300 text-gray-600 cursor-not-allowed' 
                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg'
                    }
                  `}
                >
                  {isChatLoading ? (
                    <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                      </svg>
                      Send
                    </>
                  )}
                </motion.button>
              </form>
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>

      <AnimatePresence>
        {selectedPaper && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedPaper(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-semibold text-gray-800">{selectedPaper.title}</h2>
                <button
                  onClick={() => setSelectedPaper(null)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-600">Authors</h3>
                      <p className="text-gray-800">{selectedPaper.authors}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-600">Citations</h3>
                      <p className="text-gray-800">{selectedPaper.citations}</p>
                    </div>
                    {selectedPaper.journal && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-600">Journal</h3>
                        <p className="text-gray-800">{selectedPaper.journal}</p>
                      </div>
                    )}
                    {selectedPaper.year && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-600">Year</h3>
                        <p className="text-gray-800">{selectedPaper.year}</p>
                      </div>
                    )}
                    {selectedPaper.doi && (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-600">DOI</h3>
                        <p className="text-gray-800">{selectedPaper.doi}</p>
                      </div>
                    )}
                  </div>
                </div>

                {selectedPaper.keywords && (
                  <div>
                    <h3 className="text-md font-semibold text-gray-800 mb-2">Keywords</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedPaper.keywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedPaper.abstract && (
                  <div>
                    <h3 className="text-md font-semibold text-gray-800 mb-2">Abstract</h3>
                    <p className="text-gray-700 leading-relaxed">{selectedPaper.abstract}</p>
                  </div>
                )}

                {selectedPaper.methodology && (
                  <div>
                    <h3 className="text-md font-semibold text-gray-800 mb-2">Methodology</h3>
                    <p className="text-gray-700 leading-relaxed">{selectedPaper.methodology}</p>
                  </div>
                )}

                {selectedPaper.conclusions && (
                  <div>
                    <h3 className="text-md font-semibold text-gray-800 mb-2">Conclusions</h3>
                    <p className="text-gray-700 leading-relaxed">{selectedPaper.conclusions}</p>
                  </div>
                )}

                <div>
                  <h3 className="text-md font-semibold text-gray-800 mb-2">Quick Summary</h3>
                  <p className="text-gray-700 leading-relaxed">{selectedPaper.snippet}</p>
                </div>

                <div className="border-t pt-4 mt-4">
                  <a
                    href={selectedPaper.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    <span>View Full Paper</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MedicalResearch; 