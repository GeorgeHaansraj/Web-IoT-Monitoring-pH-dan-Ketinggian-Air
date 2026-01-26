// proxy.ts - Next.js proxy file untuk autentikasi dan proteksi route
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export const proxy = auth((req) => {
  try {
    const isLoggedIn = !!req.auth;
    const userRole = (req.auth?.user as any)?.role;
    const { pathname } = req.nextUrl;

    // Skip API routes and static files
    if (
      pathname.startsWith("/api") ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/favicon.ico")
    ) {
      return NextResponse.next();
    }

    // 1. Tentukan halaman publik yang boleh diakses tanpa login sama sekali
    const isPublicPage = pathname === "/login" || pathname === "/signup";

    // 2. LOGIKA ADMIN - Proteksi halaman admin berdasarkan NextAuth role
    // Handle legacy /admin/login URL to prevent 404
    if (pathname === "/admin/login") {
      if (isLoggedIn && userRole === "admin") {
        return NextResponse.redirect(new URL("/admin", req.nextUrl));
      }
      return NextResponse.redirect(new URL("/login", req.nextUrl));
    }

    if (pathname.startsWith("/admin")) {
      // Jika belum login sama sekali, arahkan ke login
      if (!isLoggedIn) {
        return NextResponse.redirect(new URL("/login", req.nextUrl));
      }

      // Jika sudah login tapi bukan admin, arahkan ke home
      if (userRole !== "admin") {
        return NextResponse.redirect(new URL("/", req.nextUrl));
      }

      // Jika sudah login dan admin, izinkan akses
      return NextResponse.next();
    }

    // 3. LOGIKA USER BIASA (NextAuth)
    // Arahkan ke halaman login jika mencoba akses halaman privat (bukan admin)
    if (!isLoggedIn && !isPublicPage) {
      return NextResponse.redirect(new URL("/login", req.nextUrl));
    }

    // Arahkan ke dashboard jika sudah login tapi mencoba mengakses login/signup
    if (isLoggedIn && isPublicPage) {
      // Jika admin, arahkan ke admin dashboard
      if (userRole === "admin") {
        return NextResponse.redirect(new URL("/admin", req.nextUrl));
      }
      return NextResponse.redirect(new URL("/", req.nextUrl));
    }

    // Redirect admin users from home to admin dashboard
    if (isLoggedIn && pathname === "/" && userRole === "admin") {
      return NextResponse.redirect(new URL("/admin", req.nextUrl));
    }

    // 4. Role Protection (Mencegah akses silang antar lahan)
    if (isLoggedIn) {
      if (pathname.startsWith("/sawah") && userRole !== "sawah") {
        return NextResponse.redirect(new URL("/", req.nextUrl));
      }

      if (pathname.startsWith("/kolam") && userRole !== "kolam") {
        return NextResponse.redirect(new URL("/", req.nextUrl));
      }

      if (pathname.startsWith("/sumur") && userRole !== "sumur") {
        return NextResponse.redirect(new URL("/", req.nextUrl));
      }
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Proxy error:", error);
    // Fallback: allow request to proceed if there's an error
    return NextResponse.next();
  }
});

// Matcher untuk menentukan route mana yang akan diproses oleh proxy
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
