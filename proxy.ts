import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/unauthorized(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }

  const { userId, sessionClaims } = await auth();

  if (userId) {
    const role =
      (sessionClaims?.publicMetadata as { role?: string })?.role ||
      (sessionClaims?.unsafeMetadata as { role?: string })?.role;

    const pathname = req.nextUrl.pathname;

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
          return NextResponse.redirect(new URL("/unauthorized", req.url));
      }
    }

    if (role && pathname.startsWith("/dashboard/hospital") && role !== "hospital_staff" && role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
    if (role && pathname.startsWith("/dashboard/midwife") && role !== "midwife" && role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
    if (role && pathname.startsWith("/dashboard/pregnant-woman") && role !== "pregnant_woman" && role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
    if (role && pathname.startsWith("/dashboard/father") && role !== "father" && role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
    if (role && pathname.startsWith("/dashboard/admin") && role !== "admin") {
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
