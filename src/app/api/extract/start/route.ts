import { NextResponse } from 'next/server';
import { processWithOpenAI, splitContent, cleanContent } from '../utils';

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
                console.log(`Processing ${urlObj.link}`);
                const response = await fetch(urlObj.link);
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch URL: ${response.statusText}`);
                }

                const html = await response.text();
                const content = cleanContent(html);
                const chunks = splitContent(content);
                const triples = [];

                for (let i = 0; i < chunks.length; i++) {
                    const chunkTriples = await processWithOpenAI(chunks[i], apiKey, language);
                    triples.push(...chunkTriples);
                }

                results.push({
                    url: urlObj.link,
                    triples,
                    success: true
                });

            } catch (error) {
                console.error(`Error processing ${urlObj.link}:`, error);
                results.push({
                    url: urlObj.link,
                    error: error.message,
                    success: false
                });
            }
        }

        return NextResponse.json({ 
            success: true,
            results 
        });

    } catch (error) {
        console.error('Extraction start error:', error);
        return NextResponse.json(
            { error: 'Failed to start extraction' },
            { status: 500 }
        );
    }
}