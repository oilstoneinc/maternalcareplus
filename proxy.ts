import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "./lib/db";
import { users } from "./lib/db/schema";
import { eq } from "drizzle-orm";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // If the route is not public and the user is not authenticated, protect it
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  const { userId, sessionClaims } = await auth();

  // Handle role-based redirections for authenticated users
  if (userId) {
    // 1. Check Clerk Session Claims (Fastest)
    const publicRole = (sessionClaims?.publicMetadata as any)?.role;
    const unsafeRole = (sessionClaims?.unsafeMetadata as any)?.role;
    let role = publicRole || unsafeRole;
    
    // 2. DATABASE FALLBACK (Self-Healing)
    // If Clerk metadata is missing (Dashboard config missing or cache delay), 
    // check Neon directly for the role.
    if (!role) {
      const dbUser = await db.query.users.findFirst({
        where: eq(users.clerkId, userId)
      });
      if (dbUser?.role) {
        role = dbUser.role;
        console.log(`Middleware: Database-First detection for ${userId} - Role: ${role}`);
      }
    }
    
    const pathname = req.nextUrl.pathname;

    // Redirect authenticated users from root or plain dashboard directly to their specific role dashboard
    if (pathname === "/" || pathname === "/dashboard") {
      switch (role) {
        case "pregnant_woman":
          return NextResponse.redirect(new URL("/dashboard/pregnant-woman", req.url));
        case "father":
          return NextResponse.redirect(new URL("/dashboard/father", req.url));
        case "midwife":
          return NextResponse.redirect(new URL("/dashboard/midwife", req.url));
        case "hospital_staff":
          return NextResponse.redirect(new URL("/dashboard/hospital", req.url));
        case "admin":
          return NextResponse.redirect(new URL("/dashboard/admin", req.url));
        default:
          // In a closed-loop system, unknown users are sent to unauthorized
          return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }

    // Protect role-specific routes (only if role is explicitly set to something else)
    if (pathname.startsWith("/dashboard/hospital") && role && role !== "hospital_staff" && role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
    if (pathname.startsWith("/dashboard/midwife") && role && role !== "midwife" && role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
    if (pathname.startsWith("/dashboard/pregnant-woman") && role && role !== "pregnant_woman" && role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
    if (pathname.startsWith("/dashboard/father") && role && role !== "father" && role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
    if (pathname.startsWith("/dashboard/admin") && role && role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
