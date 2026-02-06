import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "100");

    const readings = await prisma.monitoringLog.findMany({
      where: {},
      orderBy: { created_at: 'desc' },
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
    const { value, location, temperature, battery } = body;

    const reading = await prisma.monitoringLog.create({
      data: {
        ph_value: parseFloat(value),
        location,
        battery_level: battery ? parseFloat(battery) : null,
        temperature: temperature ? parseFloat(temperature) : null,
      },
    });

    const phValue = parseFloat(value);

    // Check for alerts
    if (phValue < 6.5 || phValue > 8.5) {
      await prisma.alert.create({
        data: {
          type: phValue < 6.5 ? 'ph_low' : 'ph_high',
          message: `pH level ${phValue < 6.5 ? 'too low' : 'too high'} at ${location}: ${phValue}`,
          location,
          severity: phValue < 6.0 || phValue > 9.0 ? 'critical' : 'medium',
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
