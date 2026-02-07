import { NextResponse } from "next/server";

export async function PATCH() {
  return NextResponse.json(
    { error: "Endpoint tidak tersedia" },
    { status: 404 }
  );
}

