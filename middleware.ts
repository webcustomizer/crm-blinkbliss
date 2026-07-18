import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getTokenFromRequest } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const token = await getTokenFromRequest(request);
  const { pathname } = request.nextUrl;

  // Public Routes
  if (pathname === '/' || pathname === '/login') {
    if (!token) {
      return NextResponse.next();
    }

    try {
      const user = await verifyToken(token);

      if (user.role === 'ADMIN') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }

      return NextResponse.redirect(new URL('/sales/dashboard', request.url));
    } catch {
      return NextResponse.next();
    }
  }

  const isApiRoute = pathname.startsWith('/api');

  // Public exception: the /form landing page (unauthenticated visitors)
  // submits new leads via POST here. Everything else under
  // /api/admin/leads (GET, PATCH, etc.) still requires an admin token.
  const isPublicLeadSubmission =
    pathname === '/api/admin/leads' && request.method === 'POST';

  // Allow public metrics and cache endpoints
  const isPublicUtility =
    pathname === '/api/metrics' || pathname === '/api/cache';

  if (isPublicLeadSubmission || isPublicUtility) {
    return NextResponse.next();
  }

  // Protected Routes
  if (!token) {
    if (isApiRoute) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const user = await verifyToken(token);

    // Admin Routes
    if (
      (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) &&
      user.role !== 'ADMIN'
    ) {
      if (isApiRoute) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/sales/dashboard', request.url));
    }

    // Sales Routes
    if (
      (pathname.startsWith('/sales') ||
        pathname.startsWith('/api/salesperson')) &&
      user.role !== 'SALESPERSON'
    ) {
      if (isApiRoute) {
        return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }

    // Add response compression headers
    const response = NextResponse.next();
    response.headers.set('Vary', 'Accept-Encoding');
    return response;
  } catch {
    if (isApiRoute) {
      const response = NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
      response.cookies.delete('token');
      return response;
    }

    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('token');
    return response;
  }
}

export const config = {
  matcher: [
    '/login',
    '/admin/:path*',
    '/sales/:path*',
    '/api/admin/:path*',
    '/api/salesperson/:path*',
  ],
};
