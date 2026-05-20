import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
      // Fetch details from Supabase to construct repoFullName for the Judging Engine
      const { data: sub, error: fetchError } = await supabase
        .from('submissions')
        .select('owner, repo_name')
        .eq('id', id)
        .maybeSingle();

      if (!fetchError && sub) {
        const repoFullName = `${sub.owner}/${sub.repo_name}`.toLowerCase();
        let rawEngineUrl = process.env.VITE_JUDGING_ENGINE_URL || '';
        if (rawEngineUrl.endsWith('/')) {
          rawEngineUrl = rawEngineUrl.slice(0, -1);
        }
        
        if (rawEngineUrl && !rawEngineUrl.includes('placeholder')) {
          try {
            await fetch(`${rawEngineUrl}/api/results?repoFullName=${encodeURIComponent(repoFullName)}`, {
              method: 'DELETE'
            });
            console.log(`[Admin Action] Deleted ${repoFullName} from judging engine.`);
          } catch (err: any) {
            console.error('[Admin Action] Failed to delete from judging engine:', err.message);
          }
        }
      }

      const { error } = await supabase.from('submissions').delete().eq('id', id);
      if (error) throw error;
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

      const { error } = await supabase.from('submissions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown Action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
