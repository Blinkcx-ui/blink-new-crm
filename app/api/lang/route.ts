import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const loc = searchParams.get('loc') || 'en';

  const response = NextResponse.redirect(new URL('/', origin));
  response.cookies.set('NEXT_LOCALE', loc, { path: '/' });
  return response;
}