import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const location = searchParams.get('location')
    const unreadOnly = searchParams.get('unread') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50')

    const alerts = await prisma.alert.findMany({
      where: {
        ...(location ? { location } : {}),
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json(alerts)
  } catch (error) {
    console.error('Error fetching alerts:', error)
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { alertId, isRead, resolvedAt } = body

    const alert = await prisma.alert.update({
      where: { id: alertId },
      data: {
        ...(typeof isRead === 'boolean' ? { isRead } : {}),
        ...(resolvedAt ? { resolvedAt: new Date(resolvedAt) } : {}),
      },
    })

    return NextResponse.json(alert)
  } catch (error) {
    console.error('Error updating alert:', error)
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 })
  }
}