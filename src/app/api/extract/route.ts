import { NextResponse } from 'next/server';
import { processWithOpenAI, cleanContent } from './utils';

export async function POST(req: Request) {
   try {
       const { urls, apiKey, language } = await req.json();
       console.log('Starting extraction for URLs:', urls);

       if (!urls || !apiKey) {
           return NextResponse.json(
               { error: 'Missing required parameters' },
               { status: 400 }
           );
       }

       const results = [];

       for (const urlObj of urls) {
           try {
               console.log(`Fetching ${urlObj.link}...`);

               const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(urlObj.link)}`;
               const response = await fetch(proxyUrl, {
                   headers: {
                       'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124',
                   }
               });

               if (!response.ok) {
                   throw new Error(`Failed to fetch URL (${response.status}): ${response.statusText}`);
               }

               const html = await response.text();
               console.log('Got HTML, length:', html.length);

               const headings = cleanContent(html);
               console.log('Extracted headings:', headings);

               if (headings.length > 0) {
                   const triples = await processWithOpenAI(headings, apiKey, language);
                   console.log('Generated triples:', triples);

                   results.push({
                       url: urlObj.link,
                       headings,
                       triples,
                       success: true
                   });
               } else {
                   throw new Error('No headings found in page');
               }

           } catch (error: unknown) {
               console.error(`Error processing ${urlObj.link}:`, error);
               results.push({
                   url: urlObj.link,
                   error: error instanceof Error ? error.message : 'Unknown error occurred',
                   success: false
               });
           }
       }

       return NextResponse.json({ success: true, results });

   } catch (error: unknown) {
       console.error('Extraction failed:', error);
       return NextResponse.json(
           { 
               error: 'Failed to start extraction', 
               details: error instanceof Error ? error.message : 'Unknown error occurred'
           },
           { status: 500 }
       );
   }
}