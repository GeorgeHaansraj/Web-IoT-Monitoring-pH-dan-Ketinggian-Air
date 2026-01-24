import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        // Get device status from database
        const deviceStatus = await prisma.deviceStatus.findUnique({
            where: {
                id: 'global-device',
            },
        });

        if (!deviceStatus) {
            // Return default values if not found
            return NextResponse.json({
                activeMode: 'sawah',
                battery: 0,
                signal: 0,
                lastUpdate: new Date().toISOString(),
            });
        }

        return NextResponse.json({
            activeMode: deviceStatus.activeMode,
            battery: deviceStatus.battery || 0,
            signal: deviceStatus.signal || 0,
            lastUpdate: deviceStatus.lastUpdate.toISOString(),
        });
    } catch (error) {
        console.error('Error fetching device status:', error);
        return NextResponse.json(
            { error: 'Failed to fetch device status' },
            { status: 500 }
        );
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { activeMode, battery, signal } = body;

        // Update device status
        const updatedStatus = await prisma.deviceStatus.upsert({
            where: {
                id: 'global-device',
            },
            create: {
                id: 'global-device',
                activeMode: activeMode || 'sawah',
                battery: battery,
                signal: signal,
            },
            update: {
                activeMode: activeMode,
                battery: battery,
                signal: signal,
            },
        });

        return NextResponse.json(updatedStatus);
    } catch (error) {
        console.error('Error updating device status:', error);
        return NextResponse.json(
            { error: 'Failed to update device status' },
            { status: 500 }
        );
    }
}
