import { NextResponse } from 'next/server';
import { initDB } from '@/lib/db';
import { createHash } from 'crypto';

interface UsageReport {
  apiKeyHash: string;
  totalQueries: number;
  todayQueries: number;
  recentQueries: Array<{
    query: string;
    timestamp: string;
  }>;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const apiKey = searchParams.get('apiKey');

    if (!apiKey) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 });
    }

    const keyHash = createHash('sha256').update(apiKey).digest('hex');
    const db = await initDB();

    // Get total queries
    const totalQueries = await db.get(
      'SELECT COUNT(*) as count FROM usage WHERE api_key_hash = ?',
      [keyHash]
    );

    // Get today's queries
    const todayQueries = await db.get(
      `SELECT COUNT(*) as count FROM usage 
       WHERE api_key_hash = ? 
       AND date(timestamp) = date('now')`,
      [keyHash]
    );

    // Get recent queries (last 10)
    const recentQueries = await db.all(
      `SELECT query, timestamp FROM usage 
       WHERE api_key_hash = ? 
       ORDER BY timestamp DESC LIMIT 10`,
      [keyHash]
    );

    const report: UsageReport = {
      apiKeyHash: keyHash,
      totalQueries: totalQueries.count,
      todayQueries: todayQueries.count,
      recentQueries: recentQueries
    };

    return NextResponse.json(report);

  } catch (error) {
    console.error('Usage report error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to generate usage report'
    }, { status: 500 });
  }
}

// Optional: Add admin endpoint to see all usage
export async function POST(req: Request) {
  try {
    // Verify admin key/password here
    const { adminKey } = await req.json();
    
    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await initDB();
    
    const allUsage = await db.all(`
      SELECT 
        api_key_hash,
        COUNT(*) as total_queries,
        MAX(timestamp) as last_used
      FROM usage 
      GROUP BY api_key_hash
      ORDER BY last_used DESC
    `);

    return NextResponse.json({ usage: allUsage });

  } catch (error) {
    console.error('Admin usage report error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to generate admin report'
    }, { status: 500 });
  }
}