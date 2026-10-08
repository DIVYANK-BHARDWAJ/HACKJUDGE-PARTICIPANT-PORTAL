import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { password, action, id } = await req.json();
    const correctPassword = process.env.VITE_ADMIN_PASSWORD || 'admin';
    if (password !== correctPassword) {
      return NextResponse.json({ error: 'Unauthorized credentials.' }, { status: 401 });
    }

    const isPlaceholder = process.env.VITE_SUPABASE_URL?.includes('placeholder');
    if (isPlaceholder) {
      return NextResponse.json({ success: true, localOnly: true });
    }

    if (action === 'delete' && id) {
      let rawEngineUrl = process.env.VITE_JUDGING_ENGINE_URL || '';
      if (rawEngineUrl.endsWith('/')) {
        rawEngineUrl = rawEngineUrl.slice(0, -1);
      }
      
      if (rawEngineUrl && !rawEngineUrl.includes('placeholder')) {
        try {
          await fetch(`${rawEngineUrl}/api/results?id=${encodeURIComponent(id)}`, {
            method: 'DELETE'
          });
          console.log(`[Admin Action] Deleted ${id} from judging engine.`);
        } catch (err: any) {
          console.error('[Admin Action] Failed to delete from judging engine:', err.message);
        }
      }

      return NextResponse.json({ success: true });
    }

    if (action === 'clear') {
      let rawEngineUrl = process.env.VITE_JUDGING_ENGINE_URL || '';
      if (rawEngineUrl.endsWith('/')) {
        rawEngineUrl = rawEngineUrl.slice(0, -1);
      }
      
      if (rawEngineUrl && !rawEngineUrl.includes('placeholder')) {
        try {
          await fetch(`${rawEngineUrl}/api/results`, {
            method: 'DELETE'
          });
          console.log(`[Admin Action] Cleared all evaluations from judging engine.`);
        } catch (err: any) {
          console.error('[Admin Action] Failed to clear evaluations from judging engine:', err.message);
        }
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown Action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
