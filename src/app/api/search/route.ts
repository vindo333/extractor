import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { query, numResults, location, language } = body; // Add language here
    
    console.log('Received search request:', { query, numResults, location, language });
    
    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    const apiKey = 'AIzaSyDGEbFVlIP8zorO6deLnOfa-IdWuhIAuFY';
    const searchEngineId = '504fee02ed2384541';
    const baseUrl = 'https://www.googleapis.com/customsearch/v1';

    const results = [];
    const requestsNeeded = Math.ceil(numResults / 10);

    for (let i = 0; i < requestsNeeded; i++) {
      const startIndex = i * 10 + 1;
      const currentNum = Math.min(10, numResults - (i * 10));

      let url = new URL(baseUrl);
      url.searchParams.append('key', apiKey);
      url.searchParams.append('cx', searchEngineId);
      url.searchParams.append('q', location ? `${query} ${location}` : query);
      url.searchParams.append('num', String(currentNum));
      url.searchParams.append('start', String(startIndex));
      url.searchParams.append('lr', `lang_${language}`); // Add language filter
      url.searchParams.append('hl', language); // Add interface language

      console.log('Fetching from URL:', url.toString());

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.error) {
        console.error('Google API error:', data.error);
        return NextResponse.json({ error: data.error.message }, { status: 400 });
      }

      if (data.items) {
        results.push(...data.items.map((item: any) => ({
          link: item.link,
          displayText: item.link,
          selected: false
        })));
      }
    }

    return NextResponse.json({ results: results.slice(0, numResults) });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Search failed'
    }, { status: 500 });
  }
}
// Helper functions for content extraction
function extractContent(html: string): string {
  // Basic content extraction - we'll improve this later
  const textMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!textMatch) return '';
  
  return textMatch[1]
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractHeadings(html: string): Array<{level: number, text: string}> {
  const headings = [];
  const headingRegex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match;

  while ((match = headingRegex.exec(html)) !== null) {
    headings.push({
      level: parseInt(match[1]),
      text: match[2].replace(/<[^>]+>/g, '').trim()
    });
  }

  return headings;
}