// proxy.ts (di root project)
import { auth } from "@/auth";

export const proxy = auth((req) => {
  const isLoggedIn = !!req.auth;
  const userRole = (req.auth?.user as any)?.role;
  const { pathname } = req.nextUrl;

  if (!isLoggedIn && pathname !== "/login") {
    return Response.redirect(new URL("/login", req.nextUrl));
  }

  // Role Protection
  if (isLoggedIn && pathname.startsWith("/sawah") && userRole !== "sawah") {
    return Response.redirect(new URL("/", req.nextUrl));
  }
  // Tambahkan untuk kolam & sumur...
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
