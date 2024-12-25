import React from 'react';

interface ResultData {
    url: string;
    headings?: string[];
    triples?: [string, string, string][];
    success: boolean;
    error?: string;
}

export default function ExtractedResults({ 
    data, 
    onClose 
}: { 
    data: { results: ResultData[] },
    onClose: () => void 
}) {
    if (!data?.results) {
        return (
            <div className="fixed inset-0 bg-slate-50 overflow-auto z-50">
              <div className="p-4">
                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                  <p className="text-red-600 text-sm">No results data available</p>
                </div>
              </div>
            </div>
          );
        }
      
        return (
          <div className="fixed inset-0 bg-slate-50 overflow-auto z-50">
            <div className="p-4">
              {/* Header */}
              <div className="flex justify-between items-center mb-4 bg-white p-3 rounded-lg shadow-sm">
                <h2 className="text-lg font-bold text-slate-800">Results</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const jsonStr = JSON.stringify(data.results, null, 2);
                      const blob = new Blob([jsonStr], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'extracted-data.json';
                      a.click();
                    }}
                    className="px-2 py-1 text-xs bg-emerald-600 text-white rounded hover:bg-emerald-700"
                  >
                    Download
                  </button>
                  <button 
                    onClick={onClose}
                    className="px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
                  >
                    Back
                  </button>
                </div>
              </div>
      
              {/* Results */}
              {data.results.map((result, index) => (
                <div key={index} className="mb-4 bg-white rounded-lg shadow-sm p-4">
                  {/* URL */}
                  <div className="mb-3">
                    <a 
                      href={result.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline truncate block"
                    >
                      {result.url}
                    </a>
                  </div>
      
                  {result.success ? (
                    <div className="space-y-4">
                      {/* Headings */}
                      {result.headings && result.headings.length > 0 && (
                        <section className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                          <h4 className="text-sm font-semibold mb-2 text-slate-900">Headings</h4>
                          <ul className="text-xs space-y-1">
                            {result.headings.map((heading, idx) => (
                              <li key={idx} className="text-slate-700">{heading}</li>
                            ))}
                          </ul>
                        </section>
                      )}
      
                      {/* Triples */}
                      {result.triples && result.triples.length > 0 && (
                        <section className="bg-white p-3 rounded-lg border border-slate-200">
                          <h4 className="text-sm font-semibold mb-2 text-slate-900">Information Triples</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead className="bg-slate-50">
                                <tr>
                                  <th className="p-2 text-left font-medium text-slate-700">Subject</th>
                                  <th className="p-2 text-left font-medium text-slate-700">Predicate</th>
                                  <th className="p-2 text-left font-medium text-slate-700">Object</th>
                                </tr>
                              </thead>
                              <tbody>
                                {result.triples.map((triple, idx) => (
                                  <tr key={idx} className="border-t border-slate-100">
                                    <td className="p-2 text-slate-600">{triple[0]}</td>
                                    <td className="p-2 text-slate-600">{triple[1]}</td>
                                    <td className="p-2 text-slate-600">{triple[2]}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </section>
                      )}
                    </div>
                  ) : (
                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                      <p className="text-red-600 text-xs">Error: {result.error || 'Failed to process URL'}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
}