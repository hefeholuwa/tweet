import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { BotActivity } from '@/lib/bot';

export const dynamic = 'force-dynamic';

const ACTIVITY_PATH = "/Users/user/Desktop/PROJECT 0/tweetpy/dashboard/activity.json";

export async function GET() {
    try {
        let activities: BotActivity[] = [];
        fs.appendFileSync('/tmp/debug_stats.log', `[${new Date().toISOString()}] Reading from: ${ACTIVITY_PATH}\n`);
        if (fs.existsSync(ACTIVITY_PATH)) {
            const data = fs.readFileSync(ACTIVITY_PATH, 'utf8');
            fs.appendFileSync('/tmp/debug_stats.log', `[${new Date().toISOString()}] File size: ${data.length} chars. Sample: ${data.substring(0, 20)}\n`);
            activities = JSON.parse(data);
        } else {
            fs.appendFileSync('/tmp/debug_stats.log', `[${new Date().toISOString()}] FILE DOES NOT EXIST\n`);
        }

        // Calculate stats
        const totalActions = activities.length;
        const totalReplies = activities.filter(a => a.type === 'reply').length;
        const totalOriginalTweets = activities.filter(a => a.type === 'tweet').length;
        const searchReplies = activities.filter(a => a.source === 'search').length;
        const timelineReplies = activities.filter(a => a.source === 'timeline').length;

        // Mock trend for now or calculate from recent 24h
        const now = new Date();
        const last24hAction = activities.filter(a => {
            const date = new Date(a.timestamp);
            return (now.getTime() - date.getTime()) < 24 * 60 * 60 * 1000;
        }).length;

        const lastRun = activities.length > 0 ? activities[0].timestamp : null;

        return NextResponse.json({
            totalActions,
            totalReplies,
            totalOriginalTweets,
            searchReplies,
            timelineReplies,
            last24h: last24hAction,
            lastRun
        });
    } catch (error) {
        console.error('Failed to calculate stats:', error);
        return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
    }
}
