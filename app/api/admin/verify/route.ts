import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const correctPassword = process.env.VITE_ADMIN_PASSWORD || 'admin';
    if (password === correctPassword) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: 'Invalid admin credentials.' }, { status: 401 });
  } catch {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }
}
