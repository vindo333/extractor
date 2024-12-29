// src/app/api/extract/utils.ts
import { JSDOM } from 'jsdom';

// Type definitions
export interface Heading {
    level: number;
    text: string;
    context?: string;
    importance: number;
}

export interface ProcessedTriple {
    type: 'eav_triple' | 'spo_triple';
    entity?: string;
    attribute?: string;
    value?: string;
    subject?: string;
    predicate?: string;
    object?: string;
}

export type Triple = ProcessedTriple;

export interface ExtractedContent {
    mainContent: string;
    headings: Heading[];
    structuredData: any[];
}

// Main exported functions
export async function processWithOpenAI(
    content: ExtractedContent,
    apiKey: string,
    language: string
): Promise<Triple[]> {
    const structuredTriples = processStructuredData(content.structuredData);
    const aiTriples = await extractContentTriples(content, apiKey, language);
    return mergeTriples([...structuredTriples, ...aiTriples]);
}

export function cleanContent(html: string): ExtractedContent {
    console.log('Starting content extraction...');
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    if (!doc.body) {
        return { mainContent: '', headings: [], structuredData: [] };
    }

    const mainContent = extractText(doc.body);
    const headings = extractHeadings(doc);
    const structuredData = extractStructuredData(doc);

    return { mainContent, headings, structuredData };
}

export function buildHierarchy(headings: Heading[]): any[] {
    const hierarchy: any[] = [];
    const stack: any[] = [{ level: 0, children: hierarchy }];

    headings.forEach(heading => {
        const node = {
            text: heading.text,
            level: heading.level,
            children: [],
            context: heading.context,
            importance: heading.importance
        };

        while (stack[stack.length - 1].level >= heading.level) {
            stack.pop();
        }

        stack[stack.length - 1].children.push(node);
        stack.push(node);
    });

    return hierarchy;
}

// Content extraction functions
function extractText(element: Element): string {
    if (shouldSkipElement(element)) return '';

    const texts: string[] = [];
    element.childNodes.forEach(node => {
        if (node.nodeType === 3 && node.textContent?.trim()) {
            texts.push(node.textContent.trim());
        } else if (node.nodeType === 1) {
            texts.push(extractText(node as Element));
        }
    });

    return texts.join('\n').trim();
}

function extractHeadings(doc: Document): Heading[] {
    const headings: Heading[] = [];
    doc.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(el => {
        const text = el.textContent?.trim();
        if (text) {
            const level = parseInt(el.tagName.charAt(1));
            const context = getHeadingContext(el);
            const importance = calculateImportance(level, context);
            headings.push({ level, text, context: context.section, importance });
        }
    });
    return headings;
}

// AI processing functions
async function extractContentTriples(
    content: ExtractedContent,
    apiKey: string,
    language: string
): Promise<Triple[]> {
    const prompt = `Analyze this content and extract triples that represent factual information.
Output ONLY a JSON array of triples in this format:
[
    {
        "type": "eav_triple",
        "entity": "subject being described",
        "attribute": "property",
        "value": "value of property"
    },
    {
        "type": "spo_triple",
        "subject": "entity performing action",
        "predicate": "relationship or action",
        "object": "target of action"
    }
]

Content: ${content.mainContent.substring(0, 1500)}`;

    try {
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
                        content: `Extract semantic relationships in ${language}. Return only valid JSON array of triples.` 
                    },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.1
            }),
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
        }

        const data = await response.json();
        return validateAndCleanTriples(data);
    } catch (error) {
        console.error('API error:', error);
        throw new Error('Failed to process content');
    }
}

// Helper functions
function shouldSkipElement(element: Element): boolean {
    const tagName = element.tagName.toLowerCase();
    const style = (element as HTMLElement).style;
    return (
        ['script', 'style', 'noscript'].includes(tagName) ||
        style?.display === 'none' ||
        style?.visibility === 'hidden'
    );
}

function getHeadingContext(element: Element): { section: string; content: string } {
    const parentSection = element.closest('article, section, main, [role="main"]');
    const nearbyText = Array.from(element.parentElement?.children || [])
        .filter(el => el !== element)
        .slice(0, 3)
        .map(el => el.textContent?.trim())
        .filter(Boolean)
        .join(' ');

    return {
        section: parentSection?.getAttribute('id') || 
                parentSection?.className || 
                'main',
        content: nearbyText
    };
}

function calculateImportance(level: number, context: { section: string; content: string }): number {
    let score = 7 - level;
    if (context.section === 'main') score += 2;
    if (context.content.length > 100) score += 1;
    return Math.min(10, Math.max(1, score));
}

function validateAndCleanTriples(data: any): Triple[] {
    if (!data.choices?.[0]?.message?.content) {
        throw new Error('Invalid response structure');
    }

    try {
        let content = data.choices[0].message.content.trim();
        const jsonMatch = content.match(/\[\s*\{[\s\S]*\}\s*\]/);
        
        if (!jsonMatch) {
            throw new Error('No valid JSON array found');
        }

        const parsed = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(parsed)) {
            throw new Error('Not an array');
        }

        return parsed.filter(triple => validateTriple(triple));
    } catch (error) {
        console.error('Validation error:', error);
        throw new Error('Failed to parse response');
    }
}

function validateTriple(triple: any): boolean {
    if (!triple || typeof triple !== 'object') return false;

    if (triple.type === 'eav_triple') {
        return triple.entity?.trim() && triple.attribute?.trim() && triple.value?.trim();
    } else if (triple.type === 'spo_triple') {
        return triple.subject?.trim() && triple.predicate?.trim() && triple.object?.trim();
    }

    return false;
}

function processStructuredData(data: any[]): Triple[] {
    const triples: Triple[] = [];
    data.forEach(item => {
        if (item['@type'] === 'Product') {
            if (item.name) {
                triples.push({
                    type: 'eav_triple',
                    entity: 'Product',
                    attribute: 'name',
                    value: item.name
                });
            }
            if (item.offers?.price) {
                triples.push({
                    type: 'eav_triple',
                    entity: item.name || 'Product',
                    attribute: 'price',
                    value: `${item.offers.price} ${item.offers.priceCurrency || 'USD'}`
                });
            }
        }
    });
    return triples;
}

function extractStructuredData(doc: Document): any[] {
    const jsonLdScripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
    const structuredData = [];

    for (const script of jsonLdScripts) {
        try {
            const data = JSON.parse(script.textContent || '');
            if (data['@graph']) {
                structuredData.push(...data['@graph']);
            } else {
                structuredData.push(data);
            }
        } catch (error) {
            console.warn('Error parsing JSON-LD:', error);
        }
    }

    return processSchemaData(structuredData);
}

function processSchemaData(data: any[]): any[] {
    const processedData = [];

    for (const item of data) {
        if (!item || typeof item !== 'object') continue;

        switch (item['@type']) {
            case 'Product':
                processedData.push(processProduct(item));
                break;
            case 'Organization':
                processedData.push(processOrganization(item));
                break;
            case 'WebPage':
            case 'ItemPage':
                processedData.push(processWebPage(item));
                break;
            case 'BreadcrumbList':
                processedData.push(processBreadcrumbs(item));
                break;
            default:
                if (item['@type']) {
                    processedData.push(item);
                }
        }
    }

    return processedData;
}

function processProduct(product: any): any {
    const processed = {
        '@type': 'Product',
        name: product.name,
        description: product.description,
        price: null,
        currency: null,
        availability: null
    };

    if (product.offers) {
        const offers = Array.isArray(product.offers) ? product.offers : [product.offers];
        for (const offer of offers) {
            if (offer.priceSpecification) {
                processed.price = offer.priceSpecification[0]?.price;
                processed.currency = offer.priceSpecification[0]?.priceCurrency;
            }
            processed.availability = offer.availability;
        }
    }

    return processed;
}

function processOrganization(org: any): any {
    return {
        '@type': 'Organization',
        name: org.name,
        description: org.description,
        url: org.url,
        socialProfiles: org.sameAs || [],
        contacts: {
            telephone: org.telephone,
            email: org.email
        }
    };
}

function processWebPage(page: any): any {
    return {
        '@type': page['@type'],
        name: page.name,
        url: page.url,
        datePublished: page.datePublished,
        dateModified: page.dateModified,
        description: page.description,
        inLanguage: page.inLanguage
    };
}

function processBreadcrumbs(breadcrumb: any): any {
    const processed = {
        '@type': 'BreadcrumbList',
        items: []
    };

    if (breadcrumb.itemListElement) {
        processed.items = breadcrumb.itemListElement.map((item: any) => ({
            name: item.name,
            url: item.item,
            position: item.position
        }));
    }

    return processed;
}

function mergeTriples(triples: Triple[]): Triple[] {
    const seen = new Set<string>();
    return triples.filter(triple => {
        const key = getTripleKey(triple);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function getTripleKey(triple: Triple): string {
    if (triple.type === 'eav_triple') {
        return `eav:${triple.entity}:${triple.attribute}:${triple.value}`.toLowerCase();
    }
    return `spo:${triple.subject}:${triple.predicate}:${triple.object}`.toLowerCase();
}