import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

    // Validate credentials
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      return NextResponse.json(
        {
          success: true,
          message: "Login admin berhasil",
        },
        { status: 200 },
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          message: "Username atau password admin salah",
        },
        { status: 401 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Terjadi kesalahan pada server",
      },
      { status: 500 },
    );
  }
}
