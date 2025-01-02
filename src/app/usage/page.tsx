// src/app/usage/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';

interface UsageReport {
  apiKeyHash: string;
  totalQueries: number;
  todayQueries: number;
  recentQueries: Array<{
    query: string;
    timestamp: string;
  }>;
}

export default function UsagePage() {
  const [apiKey, setApiKey] = useState('');
  const [report, setReport] = useState<UsageReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/usage?apiKey=${apiKey}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch usage data');
      }
      
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch usage data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="h-[580px] overflow-y-auto bg-gray-50 p-4">
      <div className="space-y-4 bg-white p-4 rounded-lg shadow-sm">
        <h1 className="text-lg font-bold text-gray-800">Usage Statistics</h1>
        
        {/* API Key Input */}
        <div className="space-y-2">
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your API key"
            className="w-full p-2 border rounded"
          />
          <button
            onClick={fetchUsage}
            disabled={loading || !apiKey}
            className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
          >
            {loading ? 'Loading...' : 'View Usage'}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-2 text-sm bg-red-50 border border-red-200 rounded text-red-600">
            {error}
          </div>
        )}

        {/* Usage Stats */}
        {report && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <h3 className="text-sm font-medium text-gray-600">Total Queries</h3>
                <p className="text-2xl font-bold">{report.totalQueries}</p>
              </Card>
              <Card className="p-4">
                <h3 className="text-sm font-medium text-gray-600">Today's Queries</h3>
                <p className="text-2xl font-bold">{report.todayQueries}</p>
              </Card>
            </div>

            {/* Recent Queries */}
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-600 mb-2">Recent Queries</h3>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {report.recentQueries.map((query, index) => (
                  <div 
                    key={index}
                    className="p-2 bg-gray-50 rounded text-sm flex justify-between"
                  >
                    <span className="text-gray-700">{query.query}</span>
                    <span className="text-gray-500">
                      {new Date(query.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}