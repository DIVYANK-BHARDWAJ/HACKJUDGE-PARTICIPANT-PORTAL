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
      const { error } = await supabase.from('submissions').delete().eq('id', id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === 'clear') {
      const { error } = await supabase.from('submissions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown Action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
