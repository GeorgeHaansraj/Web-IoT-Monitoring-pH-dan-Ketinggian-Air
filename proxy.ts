// proxy.ts (di root project)
import { auth } from "@/auth";

export const proxy = auth((req) => {
  const isLoggedIn = !!req.auth;
  const userRole = (req.auth?.user as any)?.role;
  const { pathname } = req.nextUrl;

  // 1. Tentukan halaman publik yang boleh diakses tanpa login
  const isPublicPage = pathname === "/login" || pathname === "/signup";

  // 2. Arahkan ke halaman login jika belum login dan mencoba akses halaman privat
  if (!isLoggedIn && !isPublicPage) {
    return Response.redirect(new URL("/login", req.nextUrl));
  }

  // 3. Arahkan ke dashboard jika sudah login tapi mencoba mengakses login/signup
  if (isLoggedIn && isPublicPage) {
    return Response.redirect(new URL("/", req.nextUrl));
  }

  // 4. Role Protection (Mencegah akses silang antar lahan)
  if (isLoggedIn) {
    // Proteksi halaman Sawah
    if (pathname.startsWith("/sawah") && userRole !== "sawah") {
      return Response.redirect(new URL("/", req.nextUrl));
    }

    // Proteksi halaman Kolam
    if (pathname.startsWith("/kolam") && userRole !== "kolam") {
      return Response.redirect(new URL("/", req.nextUrl));
    }

    // Proteksi halaman Sumur (Jika ada)
    if (pathname.startsWith("/sumur") && userRole !== "sumur") {
      return Response.redirect(new URL("/", req.nextUrl));
    }
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
