import React from 'react';

interface Heading {
  level: number;
  text: string;
  parentSection?: string;
}

interface Triple {
  type: 'eav_triple' | 'spo_triple';
  entity?: string;
  attribute?: string;
  value?: string;
  subject?: string;
  predicate?: string;
  object?: string;
}

interface ResultData {
  url: string;
  mainContent?: string;
  headings?: Heading[];
  triples?: Triple[];
  structuredData?: any[];
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
      <div className="fixed inset-0 bg-gray-100 overflow-auto z-50">
        <div className="p-4">
          <div className="bg-red-100 p-3 rounded-lg border border-red-300">
            <p className="text-red-800 text-sm font-medium">No results data available</p>
          </div>
        </div>
      </div>
    );
  }

  const renderHeading = (heading: Heading) => {
    const headingClasses = {
      1: 'text-sm font-bold text-gray-900',
      2: 'text-sm font-semibold text-gray-900',
      3: 'text-sm text-gray-900',
      4: 'text-xs font-medium text-gray-800',
      5: 'text-xs text-gray-800',
      6: 'text-xs text-gray-700'
    };

    return (
      <li className={`${headingClasses[heading.level as keyof typeof headingClasses]} pl-${(heading.level - 1) * 2}`}>
        {heading.parentSection && (
          <span className="text-xs text-gray-500 mr-1">[{heading.parentSection}]</span>
        )}
        {heading.text}
      </li>
    );
  };

  const renderTriple = (triple: Triple) => {
    if (triple.type === 'eav_triple') {
      return (
        <tr className="border-t border-gray-200 hover:bg-gray-50">
          <td className="p-2 text-gray-900">{triple.entity}</td>
          <td className="p-2 text-gray-900">{triple.attribute}</td>
          <td className="p-2 text-gray-900">{triple.value}</td>
        </tr>
      );
    } else {
      return (
        <tr className="border-t border-gray-200 hover:bg-gray-50">
          <td className="p-2 text-gray-900">{triple.subject}</td>
          <td className="p-2 text-gray-900">{triple.predicate}</td>
          <td className="p-2 text-gray-900">{triple.object}</td>
        </tr>
      );
    }
  };

  const renderStructuredData = (data: any[]) => {
    return data.map((item, index) => (
      <div key={index} className="py-3 first:pt-0 last:pb-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
            {item['@type']}
          </span>
        </div>

        {item['@type'] === 'BreadcrumbList' && (
          <div className="flex items-center gap-2 text-sm text-gray-600 flex-wrap">
            {item.items?.map((breadcrumb: any, idx: number) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span className="text-gray-400">›</span>}
                <span className="hover:text-gray-900">
                  {breadcrumb.url ? (
                    <a href={breadcrumb.url} target="_blank" rel="noopener noreferrer" 
                       className="hover:underline">
                      {breadcrumb.name}
                    </a>
                  ) : (
                    breadcrumb.name
                  )}
                </span>
              </React.Fragment>
            ))}
          </div>
        )}

        {item['@type'] === 'Organization' && (
          <div className="space-y-2">
            <h5 className="font-medium text-gray-900">{item.name}</h5>
            {item.description && (
              <p className="text-sm text-gray-600">{item.description}</p>
            )}
            {item.contacts?.telephone && (
              <p className="text-sm">
                <span className="text-gray-600">Phone: </span>
                <a href={`tel:${item.contacts.telephone}`} className="text-blue-600 hover:underline">
                  {item.contacts.telephone}
                </a>
              </p>
            )}
            {item.socialProfiles && item.socialProfiles.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {item.socialProfiles.map((profile: string, idx: number) => (
                  <a key={idx} href={profile} target="_blank" rel="noopener noreferrer"
                     className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                    {new URL(profile).hostname.split('.')[1]}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {item['@type'] === 'Product' && (
          <div className="space-y-2">
            <h5 className="font-medium text-gray-900">{item.name}</h5>
            {item.description && (
              <p className="text-sm text-gray-600">{item.description}</p>
            )}
            <div className="flex gap-4 text-sm">
              {item.price && (
                <span className="text-green-600 font-medium">
                  {item.price} {item.currency}
                </span>
              )}
              {item.availability && (
                <span className="text-blue-600">
                  {item.availability.replace('http://schema.org/', '')}
                </span>
              )}
            </div>
          </div>
        )}

        {(item['@type'] === 'WebSite' || item['@type'] === 'ItemPage') && (
          <div className="space-y-2">
            <h5 className="font-medium text-gray-900">{item.name}</h5>
            {item.description && (
              <p className="text-sm text-gray-600">{item.description}</p>
            )}
            <div className="text-xs space-y-1">
              {item.url && (
                <p>
                  <span className="text-gray-500">URL: </span>
                  <a href={item.url} target="_blank" rel="noopener noreferrer" 
                     className="text-blue-600 hover:underline break-all">
                    {item.url}
                  </a>
                </p>
              )}
              {item.dateModified && (
                <p className="text-gray-500">
                  Modified: {new Date(item.dateModified).toLocaleDateString()}
                </p>
              )}
              {item.inLanguage && (
                <p className="text-gray-500">Language: {item.inLanguage}</p>
              )}
            </div>
          </div>
        )}
      </div>
    ));
  };

  return (
    <div className="fixed inset-0 bg-gray-100 overflow-auto z-50">
      <div className="p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Extraction Results</h2>
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
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
            >
              Download JSON
            </button>
            <button 
              onClick={onClose}
              className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-medium"
            >
              Back
            </button>
          </div>
        </div>

        {/* Results */}
        {data.results.map((result, index) => (
          <div key={index} className="mb-4 bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            {/* URL and Stats */}
            <div className="mb-4 flex justify-between items-start border-b border-gray-200 pb-3">
              <a 
                href={result.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline truncate block max-w-2xl font-medium"
              >
                {result.url}
              </a>
              {result.success && (
                <div className="text-sm text-gray-600 font-medium">
                  {result.headings?.length || 0} headings • {result.triples?.length || 0} triples
                </div>
              )}
            </div>

            {result.success ? (
              <div className="space-y-6">
                {/* Headings */}
                {result.headings && result.headings.length > 0 && (
                  <section className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-semibold mb-3 text-gray-900">Content Structure</h4>
                    <ul className="space-y-2">
                      {result.headings.map((heading, idx) => (
                        <React.Fragment key={idx}>
                          {renderHeading(heading)}
                        </React.Fragment>
                      ))}
                    </ul>
                  </section>
                )}

                {/* Triples */}
                {result.triples && result.triples.length > 0 && (
                  <section className="bg-white p-4 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-semibold mb-3 text-gray-900">Extracted Information</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="p-2 text-left font-semibold text-gray-900">Entity/Subject</th>
                            <th className="p-2 text-left font-semibold text-gray-900">Attribute/Predicate</th>
                            <th className="p-2 text-left font-semibold text-gray-900">Value/Object</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.triples.map((triple, idx) => (
                            <React.Fragment key={idx}>
                              {renderTriple(triple)}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}

                {/* Structured Data */}
                {result.structuredData && result.structuredData.length > 0 && (
                  <section className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-semibold mb-3 text-gray-900">Structured Data</h4>
                    <div className="divide-y divide-gray-200">
                      {renderStructuredData(result.structuredData)}
                    </div>
                  </section>
                )}
              </div>
            ) : (
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <p className="text-red-800 text-sm font-medium">Error: {result.error || 'Failed to process URL'}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}