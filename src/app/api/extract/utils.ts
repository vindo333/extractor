// src/app/api/extract/utils.ts

export function cleanContent(html: string): string[] {
    console.log('Starting content cleaning...');
    
    // Remove header, footer, nav elements first
    console.log('Removing header/footer/nav...');
    const cleanedHtml = html
        .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
        .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
        .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');

    // Extract headings
    console.log('Extracting headings...');
    const headings: string[] = [];
    const headingRegex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
    let match;

    while ((match = headingRegex.exec(cleanedHtml)) !== null) {
        const headingText = match[2]
            .replace(/<[^>]+>/g, '')  // Remove HTML tags
            .replace(/&nbsp;/g, ' ')  // Replace HTML entities
            .replace(/\s+/g, ' ')     // Normalize whitespace
            .trim();
        
        if (headingText) {
            console.log('Found heading:', headingText);
            headings.push(headingText);
        }
    }

    console.log(`Found ${headings.length} headings total`);
    return headings;
}

export async function processWithOpenAI(headings: string[], apiKey: string, language: string) {
    // Language-specific system messages
    const systemMessages = {
        'en': 'Extract meaningful triples in English.',
        'de': 'Extrahiere bedeutungsvolle Tripel auf Deutsch.',
        'fr': 'Extrayez des triplets significatifs en français.',
        'es': 'Extrae triples significativos en español.',
        'nl': 'Extraheer betekenisvolle triples in het Nederlands.',
        'it': 'Estrai triple significative in italiano.'
    };

    const systemPrompt = systemMessages[language] || systemMessages['en'];
    const prompt = `${systemPrompt}
    
Extract information triples from these headings:

${headings.join('\n')}

Create an array of triples where each triple is [subject, predicate, object].
Return a valid JSON array of triple arrays.

Example format:
[
    ["Website", "has section", "About Us"],
    ["Company", "offers", "Services"]
]`;

const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
        model: 'gpt-4',
        messages: [
            { 
                role: 'system', 
                content: `You are an expert in extracting information in ${language}. Format all responses in ${language}.`
            },
            { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1000
    }),
});

const data = await response.json();

// Add error handling
if (!response.ok) {
    console.error('OpenAI API error:', data);
    throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
}

if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    console.error('Unexpected API response structure:', data);
    throw new Error('Invalid API response structure');
}

try {
    return JSON.parse(data.choices[0].message.content);
} catch (error) {
    console.error('Error parsing OpenAI response content:', error);
    throw new Error('Failed to parse OpenAI response content');
}
}
