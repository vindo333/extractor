import { NextResponse } from 'next/server';
import { processWithOpenAI, cleanContent } from './utils';

export async function POST(req: Request) {
   try {
       const { urls, apiKey, language } = await req.json();

       if (!urls || !apiKey) {
           return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
       }

       const results = [];

       for (const urlObj of urls) {
           try {
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
               const headings = cleanContent(html);

               if (headings.length > 0) {
                   const triples = await processWithOpenAI(headings, apiKey, language);
                   results.push({
                       url: urlObj.link,
                       headings,
                       triples,
                       success: true
                   });
               } else {
                   throw new Error('No headings found in page');
               }

           } catch (error: any) { // Using any to fix the TypeScript error
               results.push({
                   url: urlObj.link,
                   error: error?.message || 'Unknown error occurred',
                   success: false
               });
           }
       }

       return NextResponse.json({ success: true, results });

   } catch (error: any) { // Using any to fix the TypeScript error
       return NextResponse.json({ 
           error: 'Failed to start extraction', 
           details: error?.message || 'Unknown error occurred'
       }, { status: 500 });
   }
}