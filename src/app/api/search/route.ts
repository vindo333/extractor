import { NextResponse } from 'next/server';
import { initDB } from '@/lib/db';
import { createHash } from 'crypto';

interface SearchRequest {
  query: string;
  numResults: number;
  location?: string; 
  language: string;
  apiKey: string;
}

export async function POST(req: Request) {
  try {
    const body: SearchRequest = await req.json();
    const { query, numResults, location, language, apiKey: userApiKey } = body;

    console.log('Received search request:', { query, numResults, location, language });

    let db;
    try {
      db = await initDB();
      const keyHash = createHash('sha256').update(userApiKey).digest('hex');
      
      // Check if user is blocked
      const blocked = await db.get(
        'SELECT COUNT(*) as count FROM blocked_keys WHERE api_key_hash = ?',
        [keyHash]
      );

      if (blocked?.count > 0) {
        return NextResponse.json({ 
          error: 'This API key has been blocked. Please contact support.' 
        }, { status: 403 });
      }

      // Log the usage
      await db.run(
        'INSERT INTO usage (api_key_hash, query, timestamp) VALUES (?, ?, datetime("now"))',
        [keyHash, query]
      );

      // Get today's usage count
      const todayUsage = await db.get(
        `SELECT COUNT(*) as count FROM usage 
         WHERE api_key_hash = ? 
         AND date(timestamp) = date('now')`,
        [keyHash]
      );

      console.log(`Today's usage for ${keyHash}: ${todayUsage.count}`);

    } catch (dbError) {
      console.error('Failed to log usage:', dbError);
      // Continue with search even if logging fails
    }

    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

    if (!apiKey || !searchEngineId) {
      return NextResponse.json({ error: 'API configuration missing' }, { status: 500 });
    }

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
      url.searchParams.append('lr', `lang_${language}`);
      url.searchParams.append('hl', language);

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

function extractContent(html: string): string {
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