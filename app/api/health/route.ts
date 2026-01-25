import { NextResponse } from "next/server";

export async function GET() {
  try {
    return NextResponse.json(
      { status: "ok", message: "API is working" },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
