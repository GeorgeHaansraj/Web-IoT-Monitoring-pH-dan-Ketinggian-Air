import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100");

    const readings = await prisma.pHReading.findMany({
      where: {},
      orderBy: { timestamp: "desc" },
      take: limit,
    });

    return NextResponse.json(readings);
  } catch (error) {
    console.error("Error fetching pH readings:", error);
    return NextResponse.json(
      { error: "Failed to fetch pH readings" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { value, location, deviceId, temperature } = body;

    const reading = await prisma.pHReading.create({
      data: {
        value: parseFloat(value),
        location,
        deviceId,
        temperature: temperature ? parseFloat(temperature) : null,
      },
    });

    // Check for alerts
    if (value < 6.5 || value > 8.5) {
      await prisma.alert.create({
        data: {
          type: value < 6.5 ? "ph_low" : "ph_high",
          message: `pH level ${value < 6.5 ? "too low" : "too high"} at ${location}: ${value}`,
          location,
          severity: value < 6.0 || value > 9.0 ? "critical" : "medium",
        },
      });
    }

    return NextResponse.json(reading);
  } catch (error) {
    console.error("Error creating pH reading:", error);
    return NextResponse.json(
      { error: "Failed to create pH reading" },
      { status: 500 },
    );
  }
}
