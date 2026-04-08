import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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
    // Check both public and unsafe metadata for role
    const role = (sessionClaims?.publicMetadata as any)?.role || (sessionClaims?.unsafeMetadata as any)?.role;
    const pathname = req.nextUrl.pathname;

    // Redirect authenticated users from root to their dashboard
    if (pathname === "/") {
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
          return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // Protect role-specific routes
    if (pathname.startsWith("/dashboard/hospital") && role !== "hospital_staff" && role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
    if (pathname.startsWith("/dashboard/midwife") && role !== "midwife" && role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
    if (pathname.startsWith("/dashboard/pregnant-woman") && role !== "pregnant_woman" && role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
    if (pathname.startsWith("/dashboard/father") && role !== "father" && role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
    if (pathname.startsWith("/dashboard/admin") && role !== "admin") {
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
