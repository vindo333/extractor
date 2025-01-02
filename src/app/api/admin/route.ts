import { NextResponse } from 'next/server';
import { initDB } from '@/lib/db';
import { headers } from 'next/headers';

export async function GET(req: Request) {
  try {
    const headersList = headers();
    const adminKey = (await headersList).get('x-admin-key');

    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await initDB();
    
    // Updated query to include blocked status
    const usage = await db.all(`
      SELECT 
        u.api_key_hash,
        COUNT(*) as total_queries,
        COUNT(CASE WHEN date(u.timestamp) = date('now') THEN 1 END) as queries_today,
        MAX(u.timestamp) as last_query_at,
        CASE WHEN b.api_key_hash IS NOT NULL THEN 1 ELSE 0 END as is_blocked
      FROM usage u
      LEFT JOIN blocked_keys b ON u.api_key_hash = b.api_key_hash
      GROUP BY u.api_key_hash
      ORDER BY last_query_at DESC
    `);

    return NextResponse.json({ usage });
  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch admin data' 
    }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const headersList = headers();
    const adminKey = (await headersList).get('x-admin-key');

    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { apiKeyHash, action } = await req.json();
    const db = await initDB();

    if (action === 'block') {
      // Using INSERT OR REPLACE to handle potential duplicates
      await db.run(
        'INSERT OR REPLACE INTO blocked_keys (api_key_hash) VALUES (?)',
        [apiKeyHash]
      );
    } else if (action === 'unblock') {
      await db.run(
        'DELETE FROM blocked_keys WHERE api_key_hash = ?',
        [apiKeyHash]
      );
    }

    // Get current block status
    const blocked = await db.get(
      'SELECT 1 FROM blocked_keys WHERE api_key_hash = ?',
      [apiKeyHash]
    );

    return NextResponse.json({ 
      success: true,
      is_blocked: Boolean(blocked)
    });
  } catch (error) {
    console.error('Admin action error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to process admin action' 
    }, { status: 500 });
  }
}