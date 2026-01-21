import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const users = [
          {
            id: "1",
            name: "Pemilik Sawah",
            username: "sawah_user",
            password: "password123",
            role: "sawah",
          },
          {
            id: "2",
            name: "Pemilik Kolam",
            username: "kolam_user",
            password: "password123",
            role: "kolam",
          },
        ];
        const user = users.find(
          (u) =>
            u.username === credentials.username &&
            u.password === credentials.password,
        );
        if (!user) return null;
        return { id: user.id, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = (user as any).role;
      return token;
    },
    async session({ session, token }) {
      if (session.user) (session.user as any).role = token.role;
      return session;
    },
  },
});
