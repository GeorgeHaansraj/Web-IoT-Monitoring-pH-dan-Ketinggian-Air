import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const users = await prisma.user.findMany({ take: 1 });
    return NextResponse.json(
      { message: "Database is working", count: users.length },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: `Database error: ${error}` },
      { status: 500 },
    );
  }
}
