import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { access_token } = await request.json();

  if (!access_token) {
    return NextResponse.json({ error: 'Access token is required' }, { status: 400 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set('sb-access-token', access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  return response;
}