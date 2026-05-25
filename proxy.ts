import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const PW_DEVICE_COOKIE = "mc_pw_device_verified";
const PARTNER_SESSION_COOKIE = "mc_partner_readonly";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
]);

const isPartnerAccessRoute = createRouteMatcher([
  "/dashboard/pregnant-woman/partner-access(.*)",
]);

function cookieMatchesUser(
  raw: string | undefined,
  clerkUserId: string
): boolean {
  if (!raw) return false;
  return raw.startsWith(`${clerkUserId}:`);
}

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
    const partnerCookie = req.cookies.get(PARTNER_SESSION_COOKIE)?.value;
    const motherCookie = req.cookies.get(PW_DEVICE_COOKIE)?.value;
    const isPartnerSession = cookieMatchesUser(partnerCookie, userId);
    const isMotherDevice = cookieMatchesUser(motherCookie, userId);

    if (pathname === "/" || pathname === "/dashboard") {
      if (role === "pregnant_woman") {
        const dest = isPartnerSession
          ? "/dashboard/father"
          : isMotherDevice
            ? "/dashboard/pregnant-woman"
            : "/dashboard/pregnant-woman/partner-access";
        return NextResponse.redirect(new URL(dest, req.url));
      }
      switch (role) {
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
    if (role && pathname.startsWith("/dashboard/admin") && role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    if (role === "pregnant_woman") {
      if (isPartnerSession && pathname.startsWith("/dashboard/pregnant-woman") && !isPartnerAccessRoute(req)) {
        return NextResponse.redirect(new URL("/dashboard/father", req.url));
      }
      if (
        !isPartnerSession &&
        pathname.startsWith("/dashboard/pregnant-woman") &&
        !isPartnerAccessRoute(req) &&
        !isMotherDevice
      ) {
        return NextResponse.redirect(
          new URL("/dashboard/pregnant-woman/partner-access", req.url)
        );
      }
      if (
        !isPartnerSession &&
        pathname.startsWith("/dashboard/father")
      ) {
        return NextResponse.redirect(
          new URL("/dashboard/pregnant-woman/partner-access", req.url)
        );
      }
    }

    if (role === "father" && pathname.startsWith("/dashboard/father")) {
      return NextResponse.next();
    }
    if (role && pathname.startsWith("/dashboard/pregnant-woman") && role !== "pregnant_woman" && role !== "admin") {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }
    if (role && pathname.startsWith("/dashboard/father") && role !== "father" && role !== "pregnant_woman" && role !== "admin") {
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
