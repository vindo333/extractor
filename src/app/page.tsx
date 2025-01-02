'use client';

import { useState, FormEvent, useEffect } from 'react';
import ExtractionOverlay from '@/components/ExtractionOverlay';
import ExtractedResults from '@/components/ExtractedResults';
import { saveState, loadState, clearState } from '@/lib/stateManager';
import { playNotificationSound } from '@/lib/soundUtils';


interface SearchConfig {
  query: string;
  apiKey: string;
  numResults: number;
  location?: string;
  language: string;
}

interface SearchResult {
  link: string;
  displayText: string;
  selected?: boolean;
}

interface ExtractionState {
  status: 'idle' | 'extracting' | 'viewing-results';
  currentUrl: string | null;
  progress: number;
  step: string;
  results: any[];
}

export default function Home() {
  // Form States
  const [apiKey, setApiKey] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [numResults, setNumResults] = useState(5);
  const [language, setLanguage] = useState('en');
  const [location, setLocation] = useState('');
  
  // Results States
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [manualUrls, setManualUrls] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Extraction State
  const [extraction, setExtraction] = useState<ExtractionState>({
    status: 'idle',
    currentUrl: null,
    progress: 0,
    step: '',
    results: []
  });

  // Load state from cookies on mount
  useEffect(() => {
    // Listen for state updates from extension
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'LOAD_STATE' && event.data.state) {
        const state = event.data.state;
        setApiKey(state.apiKey || '');
        setLanguage(state.language || 'en');
        setSearchResults(state.searchResults || []);
        if (state.extractionResults?.length) {
          setExtraction(prev => ({
            ...prev,
            status: 'viewing-results',
            results: state.extractionResults
          }));
        }
      }
    };
  
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Save state when important values change
  useEffect(() => {
    saveState({
      searchResults,
      extractionResults: extraction.results,
      apiKey,
      language
    });
  }, [searchResults, extraction.results, apiKey, language]);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setError(null);
    
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          apiKey,
          numResults,
          language,
          location
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      setSearchResults(data.results);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Search failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualUrlAdd = () => {
    const newUrls = manualUrls
      .split('\n')
      .map(url => url.trim())
      .filter(url => url)
      .map(url => ({
        link: url,
        displayText: url,
        selected: true
      }));

    const updatedResults = [...searchResults, ...newUrls];
    setSearchResults(updatedResults);
    setManualUrls('');
    
    // Save updated results to state
    saveState({
      searchResults: updatedResults,
      extractionResults: extraction.results,
      apiKey,
      language
    });
  };

  const handleExtract = async () => {
    const selectedUrls = searchResults.filter(result => result.selected);
    
    if (selectedUrls.length === 0) {
      setError('Please select at least one URL to extract content from');
      return;
    }
  
    setExtraction({
      status: 'extracting',
      currentUrl: selectedUrls[0].link,
      progress: 0,
      step: 'Starting extraction...',
      results: []
    });
  
    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          urls: selectedUrls,
          apiKey,
          language
        }),
      });
  
      if (!response.ok) {
        throw new Error('Extraction failed');
      }
  
      const data = await response.json();
      
      const newState = {
        ...extraction,
        status: 'viewing-results',
        progress: 100,
        step: 'Extraction complete',
        results: data.results
      };
  
      setExtraction(newState);
  
      // Play notification sound
      playNotificationSound();
  
      // Save to cookies/storage
      saveState({
        searchResults,
        extractionResults: data.results,
        apiKey,
        language
      });
  
    } catch (error) {
      console.error('Extraction error:', error);
      setError(error instanceof Error ? error.message : 'Extraction failed');
      setExtraction(prev => ({ 
        ...prev, 
        status: 'idle',
        progress: 0,
        step: ''
      }));
    }
  };

  const handleReset = () => {
    clearState();
    setSearchResults([]);
    setExtraction({
      status: 'idle',
      currentUrl: null,
      progress: 0,
      step: '',
      results: []
    });
    setError(null);
    setSearchQuery('');
    setLocation('');
  };

  return (
    <main className="h-[580px] overflow-y-auto bg-gray-50 p-4">
      <div className="space-y-4 bg-white p-4 rounded-lg shadow-sm">
        {/* Header buttons */}
<div className="flex justify-between items-center mb-2">
  <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">
    Information Gain
  </h1>
  <div className="flex space-x-2">
    <a
      href="/usage"
      className="px-2 py-1 text-xs bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
    >
      Usage Stats
    </a>
    <button
      onClick={handleReset}
      className="px-2 py-1 text-xs bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
    >
      Reset
    </button>
  </div>
</div>
  
        {/* Form */}
        <form onSubmit={handleSearch} className="space-y-3">
          {/* API Key Input */}
          <div>
            <label htmlFor="apiKey" className="block text-xs font-medium text-gray-700">
              API Key:
            </label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500 text-black bg-white"
              placeholder="OpenAI API Key"
            />
          </div>
  
          {/* Search Query Input */}
          <div>
            <label htmlFor="searchQuery" className="block text-xs font-medium text-gray-700">
              Search:
            </label>
            <input
              type="text"
              id="searchQuery"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500 text-black bg-white"
              placeholder="Enter search query"
            />
          </div>
  
          {/* Results and Language Inputs */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="resultCount" className="block text-xs font-medium text-gray-700">
                Results:
              </label>
              <input
                type="number"
                id="resultCount"
                min="1"
                max="10"
                value={numResults}
                onChange={(e) => setNumResults(Number(e.target.value))}
                className="w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500 text-black bg-white"
              />
            </div>
  
            <div>
              <label htmlFor="language" className="block text-xs font-medium text-gray-700">
                Language:
              </label>
              <select
                id="language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full p-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500 text-black bg-white"
              >
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="nl">Nederlands</option>
                <option value="it">Italiano</option>
                <option value="fr">Français</option>
                <option value="es">Español</option>
              </select>
            </div>
          </div>
  
          {/* Search Button */}
          <button
            type="submit"
            disabled={isProcessing}
            className="w-full py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
          >
            {isProcessing ? 'Searching...' : 'Search'}
          </button>
        </form>
  
        {/* Error Display */}
        {error && (
          <div className="p-2 text-xs bg-red-50 border border-red-200 rounded text-red-600">
            {error}
          </div>
        )}
  
        {/* Manual URL Input */}
        <div className="pt-3 border-t">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Manual URLs:
          </label>
          <textarea
            value={manualUrls}
            onChange={(e) => setManualUrls(e.target.value)}
            className="w-full h-20 p-1.5 text-sm border rounded focus:ring-1 focus:ring-blue-500 text-black bg-white"
            placeholder="Enter URLs, one per line"
          />
          <button
            onClick={handleManualUrlAdd}
            className="w-full mt-2 py-1.5 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Add URLs
          </button>
        </div>
  
        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="pt-3 border-t">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-medium text-gray-800">Results</h2>
              <button
                onClick={handleExtract}
                disabled={extraction.status === 'extracting'}
                className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-green-300"
              >
                {extraction.status === 'extracting' ? 'Extracting...' : 'Extract Selected'}
              </button>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {searchResults.map((result, index) => (
                <div key={index} className="flex items-center space-x-2 p-1.5 bg-gray-50 rounded text-xs">
                  <input
                    type="checkbox"
                    checked={result.selected}
                    onChange={() => {
                      const newResults = [...searchResults];
                      newResults[index] = {
                        ...result,
                        selected: !result.selected
                      };
                      setSearchResults(newResults);
                    }}
                    className="h-3 w-3"
                  />
                  <span className="text-gray-600 truncate">{result.displayText}</span>
                </div>
              ))}
            </div>
          </div>
        )}
  
        {/* Extraction Overlay */}
        {extraction.status === 'extracting' && (
          <ExtractionOverlay
            urls={searchResults.filter(r => r.selected).map(r => r.link)}
            currentUrl={extraction.currentUrl}
            currentStep={extraction.step}
            progress={extraction.progress}
            isComplete={false}
          />
        )}
  
        {/* Results View */}
        {extraction.status === 'viewing-results' && (
          <ExtractedResults
            data={{ results: extraction.results }}
            onClose={() => setExtraction(prev => ({ ...prev, status: 'idle' }))}
          />
        )}
      </div>
      
    </main>
  )}