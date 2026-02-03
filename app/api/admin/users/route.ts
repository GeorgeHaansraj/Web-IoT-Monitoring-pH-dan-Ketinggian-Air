import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Get all users from database
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform to match frontend interface
    // Filter out admin users - only return non-admin users
    const transformedUsers = users
      .filter((user: any) => user.role !== "admin")
      .map((user: any) => ({
        id: user.id,
        username: user.name || "Unknown",
        email: user.email,
        role: user.role as "admin" | "user" | "operator",
        location:
          user.role === "sawah" || user.role === "kolam"
            ? (user.role as "sawah" | "kolam")
            : ("both" as const),
        isActive: true, // Default to active
        createdAt: new Date(user.createdAt).toISOString().split("T")[0],
      }));

    return NextResponse.json({ users: transformedUsers });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}
