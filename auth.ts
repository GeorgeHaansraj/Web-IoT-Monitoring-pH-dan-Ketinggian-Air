import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";

export const authOptions = {
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        phone: { label: "Nomor Telepon", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        console.log("🔐 [AUTH] Authorize called with credentials:", {
          phone: credentials?.phone,
          hasPassword: !!credentials?.password,
        });

        if (!credentials?.phone || !credentials?.password) {
          console.log("❌ [AUTH] Missing phone or password");
          return null;
        }

        try {
          console.log("🔍 [AUTH] Looking for user with phone:", credentials.phone);

          // Find user in database by phone number
          const user = await prisma.user.findUnique({
            where: {
              phone: credentials.phone as string,
            },
          });

          if (!user) {
            console.log("❌ [AUTH] User not found");
            return null;
          }

          console.log("✅ [AUTH] User found:", {
            id: user.id,
            phone: user.phone,
            name: user.fullName,
            role: user.role,
          });

          // Verify password
          console.log("🔐 [AUTH] Verifying password...");
          const isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            user.password,
          );

          if (!isPasswordValid) {
            console.log("❌ [AUTH] Invalid password");
            return null;
          }

          console.log("✅ [AUTH] Password valid! Returning user object");

          return {
            id: user.id,
            name: user.fullName,
            email: user.phone, // Use phone as the email field for compatibility
            role: user.role,
          };
        } catch (error) {
          console.error("❌ [AUTH] Error in authorize:", error);
          return null;
        }
      },
    }),
  ],
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
