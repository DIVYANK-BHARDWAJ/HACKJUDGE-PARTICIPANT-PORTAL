import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/config — Returns the shared hackathon config (end time, freeze state)
export async function GET() {
  const defaultEndTime = process.env.VITE_HACKATHON_END_TIME || '2026-05-21T12:30:00Z';
  const isPlaceholder = process.env.VITE_SUPABASE_URL?.includes('placeholder');

  if (isPlaceholder) {
    return NextResponse.json({ endTime: defaultEndTime, isFrozen: false });
  }

  try {
    const { data, error } = await supabase
      .from('config')
      .select('key, value')
      .in('key', ['end_time', 'is_frozen']);

    if (error) throw error;

    const configMap: Record<string, string> = {};
    (data || []).forEach((row: { key: string; value: string }) => {
      configMap[row.key] = row.value;
    });

    return NextResponse.json({
      endTime: configMap['end_time'] || defaultEndTime,
      isFrozen: configMap['is_frozen'] === 'true',
    });
  } catch (err: any) {
    // Fallback to env if DB fails
    return NextResponse.json({ endTime: defaultEndTime, isFrozen: false });
  }
}

// POST /api/config — Admin-only: persist config to Supabase
export async function POST(req: NextRequest) {
  try {
    const { password, endTime, isFrozen } = await req.json();
    const correctPassword = process.env.VITE_ADMIN_PASSWORD || 'admin';

    if (password !== correctPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isPlaceholder = process.env.VITE_SUPABASE_URL?.includes('placeholder');
    if (isPlaceholder) {
      return NextResponse.json({ success: true, localOnly: true });
    }

    const updates: { key: string; value: string }[] = [];
    if (endTime !== undefined) updates.push({ key: 'end_time', value: endTime });
    if (isFrozen !== undefined) updates.push({ key: 'is_frozen', value: String(isFrozen) });

    if (updates.length > 0) {
      const { error } = await supabase
        .from('config')
        .upsert(updates, { onConflict: 'key' });

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
