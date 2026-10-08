import { NextRequest, NextResponse } from 'next/server';

// GET /api/config — Returns the shared hackathon config (end time, freeze state)
export async function GET() {
  const defaultEndTime = process.env.VITE_HACKATHON_END_TIME || '2026-05-21T12:30:00Z';
  return NextResponse.json({ endTime: defaultEndTime, isFrozen: false });
}

// POST /api/config — Admin-only: persist config to Supabase
export async function POST(req: NextRequest) {
  try {
    const { password, endTime, isFrozen } = await req.json();
    const correctPassword = process.env.VITE_ADMIN_PASSWORD || 'admin';

    if (password !== correctPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Removed Supabase, config persistence is disabled.
    return NextResponse.json({ success: true, localOnly: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
