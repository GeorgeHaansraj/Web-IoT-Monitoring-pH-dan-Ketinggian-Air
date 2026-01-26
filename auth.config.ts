import type { NextAuthConfig } from "next-auth";

export const authConfig = {
    pages: {
        signIn: "/login",
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnDashboard = nextUrl.pathname === "/";

            if (isOnDashboard) {
                if (isLoggedIn) return true;
                return false; // Redirect unauthenticated users to login page
            }

            // Allow access to other pages by default (like /login)
            return true;
        },
        async jwt({ token, user }) {
            if (user) {
                token.role = (user as any).role;
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as any).role = token.role;
                (session.user as any).id = token.id;
            }
            return session;
        },
        async redirect({ url, baseUrl }) {
            // Check if URL contains callbackUrl parameter
            if (url.includes("callbackUrl")) {
                const urlParams = new URLSearchParams(url.split("?")[1]);
                const callbackUrl = urlParams.get("callbackUrl");
                if (callbackUrl) return callbackUrl;
            }

            // Default redirect to home
            return url.startsWith(baseUrl) ? url : baseUrl;
        },
    },
    providers: [], // Configured in auth.ts
} satisfies NextAuthConfig;
