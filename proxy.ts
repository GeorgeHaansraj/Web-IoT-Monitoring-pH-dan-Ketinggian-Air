// proxy.ts (di root project)
import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export const proxy = auth((req) => {
  const isLoggedIn = !!req.auth;
  const userRole = (req.auth?.user as any)?.role;
  const { pathname } = req.nextUrl;

  // 1. Tentukan halaman publik yang boleh diakses tanpa login sama sekali
  const isPublicPage = pathname === "/login" || pathname === "/signup";

  // 2. LOGIKA ADMIN (Migrasi dari middleware.ts)
  // Proteksi halaman admin berdasarkan cookie 'adminToken'
  if (pathname.startsWith("/admin")) {
    const adminToken = req.cookies.get("adminToken");

    if (!adminToken) {
      // Jika tidak ada token admin, arahkan ke halaman login utama
      return NextResponse.redirect(new URL("/login", req.nextUrl));
    }
  }

  // 3. LOGIKA USER BIASA (NextAuth)
  // Arahkan ke halaman login jika mencoba akses halaman privat (bukan admin)
  if (!isLoggedIn && !isPublicPage && !pathname.startsWith("/admin")) {
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
});

// Matcher ini sudah mencakup semua rute kecuali file statis dan API
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
