// src/app/admin/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';

interface UsageData {
  api_key_hash: string;
  total_queries: number;
  queries_today: number;
  last_query_at: string;
  is_blocked: boolean;
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState('');
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsageData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin', {
        headers: {
          'x-admin-key': adminKey
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch usage data');
      }
      
      setUsageData(data.usage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch usage data');
    } finally {
      setLoading(false);
    }
  };

  const toggleBlock = async (apiKeyHash: string, currentlyBlocked: boolean) => {
    try {
      const response = await fetch('/api/admin/block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey
        },
        body: JSON.stringify({
          apiKeyHash,
          action: currentlyBlocked ? 'unblock' : 'block'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update block status');
      }

      // Update local state immediately for faster UI response
      setUsageData(prevData => 
        prevData.map(item => 
          item.api_key_hash === apiKeyHash 
            ? {...item, is_blocked: !currentlyBlocked}
            : item
        )
      );

      // Refresh data from server to ensure sync
      fetchUsageData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update block status');
    }
  };

  return (
    <main className="h-[580px] overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4">
      <div className="space-y-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-bold text-gray-800 dark:text-gray-100">
            Admin Dashboard
          </h1>
          
          <a
            href="/"
            className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Back
          </a>
        </div>

        {/* Admin Key Input */}
        <div className="space-y-2">
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="Enter admin key"
            className="w-full p-2 border rounded dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600"
          />
          <button
            onClick={fetchUsageData}
            disabled={loading || !adminKey}
            className="w-full py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300 dark:disabled:bg-blue-800"
          >
            {loading ? 'Loading...' : 'View Usage Data'}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-2 text-sm bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded text-red-600 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Usage Data Display */}
        {usageData.length > 0 && (
          <div className="space-y-4">
            {usageData.map((usage) => (
              <Card key={usage.api_key_hash} className="p-4 dark:bg-gray-700">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      API Key Hash: {usage.api_key_hash.substring(0, 8)}...
                    </p>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Total Queries: {usage.total_queries}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Queries Today: {usage.queries_today}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Last Query: {new Date(usage.last_query_at).toLocaleString()}
                      </p>
                      <p className="text-xs font-medium mt-1">
                        Status: <span className={usage.is_blocked ? 'text-red-500' : 'text-green-500'}>
                          {usage.is_blocked ? 'Blocked' : 'Active'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleBlock(usage.api_key_hash, usage.is_blocked)}
                    className={`px-3 py-1 text-xs rounded ${
                      usage.is_blocked
                        ? 'bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700'
                        : 'bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700'
                    } text-white transition-colors`}
                  >
                    {usage.is_blocked ? 'Unblock' : 'Block'}
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}