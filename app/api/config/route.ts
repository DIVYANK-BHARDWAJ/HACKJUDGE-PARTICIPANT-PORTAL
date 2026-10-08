import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    let rawEngineUrl = process.env.VITE_JUDGING_ENGINE_URL || '';
    if (rawEngineUrl.endsWith('/')) {
      rawEngineUrl = rawEngineUrl.slice(0, -1);
    }

    if (!rawEngineUrl || rawEngineUrl.includes('placeholder')) {
      const defaultEndTime = process.env.VITE_HACKATHON_END_TIME || '2026-05-21T12:30:00Z';
      return NextResponse.json({ endTime: defaultEndTime, isFrozen: false });
    }

    const res = await fetch(`${rawEngineUrl}/api/config`);
    if (!res.ok) {
      throw new Error("Failed to fetch from engine");
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    const defaultEndTime = process.env.VITE_HACKATHON_END_TIME || '2026-05-21T12:30:00Z';
    return NextResponse.json({ endTime: defaultEndTime, isFrozen: false });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { password, endTime, isFrozen } = await req.json();
    const correctPassword = process.env.VITE_ADMIN_PASSWORD || 'divyank';

    if (password !== correctPassword) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let rawEngineUrl = process.env.VITE_JUDGING_ENGINE_URL || '';
    if (rawEngineUrl.endsWith('/')) {
      rawEngineUrl = rawEngineUrl.slice(0, -1);
    }

    const res = await fetch(`${rawEngineUrl}/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, endTime, isFrozen })
    });
    
    if (!res.ok) {
      throw new Error("Failed to push config to engine");
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
