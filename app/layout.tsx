// app/layout.tsx
import NextAuthProvider from "@/components/NextAuthProvider";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {/* Bungkus seluruh aplikasi dengan SessionProvider */}
        <NextAuthProvider>{children}</NextAuthProvider>
      </body>
    </html>
  );
}
