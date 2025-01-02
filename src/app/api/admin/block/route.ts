// src/app/api/admin/block/route.ts
import { NextResponse } from 'next/server';
import { initDB } from '@/lib/db';
import { headers } from 'next/headers';

export async function POST(req: Request) {
  try {
    const headersList = headers();
    const adminKey = headersList.get('x-admin-key');

    if (adminKey !== process.env.ADMIN_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { apiKeyHash, action } = await req.json();
    const db = await initDB();

    if (action === 'block') {
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

    // Get updated status
    const blocked = await db.get(
      'SELECT 1 FROM blocked_keys WHERE api_key_hash = ?',
      [apiKeyHash]
    );

    return NextResponse.json({ 
      success: true,
      is_blocked: Boolean(blocked)
    });
  } catch (error) {
    console.error('Block/Unblock error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to update block status' 
    }, { status: 500 });
  }
}