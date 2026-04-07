import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";

export default authMiddleware({
  publicRoutes: [
    '/',
    '/sign-in(.*)',
    '/sign-up(.*)',
    '/api/webhooks(.*)',
  ],
  afterAuth: (auth, req) => {
    // Handle authenticated routes
    if (auth.userId && req.nextUrl.pathname === '/') {
      // Redirect authenticated users to dashboard
      const role = auth.sessionClaims?.publicMetadata?.role;
      
      switch (role) {
        case 'pregnant_woman':
          return NextResponse.redirect(new URL('/dashboard/pregnant-woman', req.url));
        case 'father':
          return NextResponse.redirect(new URL('/dashboard/father', req.url));
        case 'midwife':
          return NextResponse.redirect(new URL('/dashboard/midwife', req.url));
        case 'hospital_staff':
          return NextResponse.redirect(new URL('/dashboard/hospital', req.url));
        case 'admin':
          return NextResponse.redirect(new URL('/dashboard/admin', req.url));
        default:
          return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }
    
    // Protect role-specific routes
    if (auth.userId) {
      const role = auth.sessionClaims?.publicMetadata?.role;
      const pathname = req.nextUrl.pathname;
      
      // Hospital staff routes
      if (pathname.startsWith('/dashboard/hospital') && role !== 'hospital_staff' && role !== 'admin') {
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }
      
      // Midwife routes
      if (pathname.startsWith('/dashboard/midwife') && role !== 'midwife' && role !== 'admin') {
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }
      
      // Pregnant woman routes
      if (pathname.startsWith('/dashboard/pregnant-woman') && role !== 'pregnant_woman' && role !== 'admin') {
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }
      
      // Father routes
      if (pathname.startsWith('/dashboard/father') && role !== 'father' && role !== 'admin') {
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }
      
      // Admin routes
      if (pathname.startsWith('/dashboard/admin') && role !== 'admin') {
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }
    }
  },
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
