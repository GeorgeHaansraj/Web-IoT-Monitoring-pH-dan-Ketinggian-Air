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
        if (!credentials?.phone || !credentials?.password) {
          return null;
        }

        try {
          // Find user in database by phone number
          const user = await prisma.user.findUnique({
            where: {
              phone: credentials.phone as string,
            },
          });

          if (!user) {
            return null;
          }

          // Verify password
          const isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            user.password,
          );

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id,
            name: user.fullName,
            email: user.phone, // Use phone as the email field for compatibility
            role: user.role,
          };
        } catch (error) {
          console.error("Auth authorize error:", error);
          return null;
        }
      },
    }),
  ],
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
