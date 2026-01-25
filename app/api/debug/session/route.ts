import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  try {
    const session = await auth();
    return NextResponse.json({ session }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: `Auth error: ${error}` },
      { status: 500 },
    );
  }
}
