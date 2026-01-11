import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const ACTIVITY_PATH = "/Users/user/Desktop/PROJECT 0/tweetpy/dashboard/activity.json";

export async function GET() {
    try {
        if (fs.existsSync(ACTIVITY_PATH)) {
            const data = fs.readFileSync(ACTIVITY_PATH, 'utf8');
            const activities = JSON.parse(data);
            return NextResponse.json(activities);
        }
        return NextResponse.json([]);
    } catch (error) {
        console.error('Failed to read activity log:', error);
        return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 });
    }
}
