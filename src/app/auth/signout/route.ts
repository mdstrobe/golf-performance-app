import { createSupabaseServerClient } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  const response = NextResponse.redirect(new URL('/login', 'http://localhost:3000'));
  response.cookies.set('sb-access-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });

  return response;
}