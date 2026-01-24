import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const location = searchParams.get('location')
    const limit = parseInt(searchParams.get('limit') || '100')

    const readings = await prisma.waterLevelReading.findMany({
      where: location ? { location } : undefined,
      orderBy: { timestamp: 'desc' },
      take: limit,
    })

    return NextResponse.json(readings)
  } catch (error) {
    console.error('Error fetching water level readings:', error)
    return NextResponse.json({ error: 'Failed to fetch water level readings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { level, location, deviceId } = body

    // Determine status based on water level
    let status = 'normal'
    if (level < 20) status = 'critical'
    else if (level < 40) status = 'low'
    else if (level > 150) status = 'high'

    const reading = await prisma.waterLevelReading.create({
      data: {
        level: parseFloat(level),
        location,
        deviceId,
        status,
      },
    })

    // Create alert for abnormal water levels
    if (status !== 'normal') {
      await prisma.alert.create({
        data: {
          type: status === 'critical' || status === 'low' ? 'water_low' : 'water_high',
          message: `Water level ${status} at ${location}: ${level}cm`,
          location,
          severity: status === 'critical' ? 'critical' : 'medium',
        },
      })
    }

    return NextResponse.json(reading)
  } catch (error) {
    console.error('Error creating water level reading:', error)
    return NextResponse.json({ error: 'Failed to create water level reading' }, { status: 500 })
  }
}