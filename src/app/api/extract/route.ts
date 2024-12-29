// src/app/api/extract/route.ts

import { NextResponse } from 'next/server';
import { processWithOpenAI, cleanContent } from './utils';

interface UrlObject {
    link: string;
    isManual?: boolean;
    selected?: boolean;
}

interface ExtractedContent {
    url: string;
    mainContent?: string;
    headings?: Array<{
        level: number;
        text: string;
        parentSection?: string;
    }>;
    triples?: any[];
    structuredData?: any[];
    error?: string;
    success: boolean;
}

export async function POST(req: Request) {
    try {
        const { urls, apiKey, language } = await req.json();
        console.log('Starting extraction for URLs:', urls.length);

        if (!urls?.length || !apiKey) {
            return NextResponse.json(
                { error: 'Missing required parameters' },
                { status: 400 }
            );
        }

        const results: ExtractedContent[] = [];
        const totalUrls = urls.length;

        for (let i = 0; i < urls.length; i++) {
            const urlObj = urls[i];
            const progress = Math.round((i / totalUrls) * 100);

            try {
                console.log(`Processing ${urlObj.link} (${i + 1}/${totalUrls})`);

                // Fetch content with retry and proxy fallback
                let html: string;
                try {
                    const response = await fetch(urlObj.link, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124 Safari/537.36'
                        },
                        next: { revalidate: 3600 }
                    });
                    
                    if (!response.ok) {
                        throw new Error('Direct fetch failed');
                    }
                    html = await response.text();
                } catch (fetchError) {
                    console.log('Falling back to proxy...');
                    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(urlObj.link)}`;
                    const proxyResponse = await fetch(proxyUrl);
                    
                    if (!proxyResponse.ok) {
                        throw new Error(`Failed to fetch URL (${proxyResponse.status})`);
                    }
                    html = await proxyResponse.text();
                }

                // Extract content and structure
                const extractedContent = cleanContent(html);
                
                if (!extractedContent.mainContent && extractedContent.headings.length === 0) {
                    throw new Error('No meaningful content found');
                }

                // Process with OpenAI
                const triples = await processWithOpenAI(extractedContent, apiKey, language);

                results.push({
                    url: urlObj.link,
                    mainContent: extractedContent.mainContent,
                    headings: extractedContent.headings,
                    triples,
                    structuredData: extractedContent.structuredData,
                    success: true
                });

            } catch (error) {
                console.error(`Error processing ${urlObj.link}:`, error);
                results.push({
                    url: urlObj.link,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    success: false
                });
            }
        }

        // Return results with statistics
        return NextResponse.json({
            success: true,
            results,
            stats: {
                totalUrls,
                successfulExtractions: results.filter(r => r.success).length,
                failedExtractions: results.filter(r => !r.success).length,
                completionTime: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Extraction process failed:', error);
        return NextResponse.json(
            {
                error: 'Failed to start extraction',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

// Utility function to validate URLs
function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}