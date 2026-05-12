// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
    const hasToken = request.cookies.has('refresh_token');
    
    const isAuthPage = request.nextUrl.pathname.startsWith('/login') || 
                       request.nextUrl.pathname.startsWith('/signup');
    const isDashboard = request.nextUrl.pathname.startsWith('/dashboard');

    // SCENARIO 1: Logged IN, trying to reach Login/Signup
    if (hasToken && isAuthPage) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // SCENARIO 2: Logged OUT, trying to reach Dashboard
    if (!hasToken && isDashboard) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // SCENARIO 3: Logged OUT, trying to reach Login/Signup (Let them through!)
    return NextResponse.next(); 
}

export const config = {
    matcher: ['/dashboard/:path*', '/login', '/signup'],
};