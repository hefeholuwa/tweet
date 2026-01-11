import { NextResponse } from 'next/server';
import { XAPI } from '@/lib/x-api';
import { AIGenerator } from '@/lib/ai-generator';
import { Bot, BotSettings } from '@/lib/bot';
import { getConfig } from '@/lib/config-helper';
import fs from 'fs';
import path from 'path';

export async function POST() {
    try {
        const config = getConfig();

        if (!config.x.consumerKey || !config.x.accessToken) {
            return NextResponse.json({ error: 'Missing Twitter credentials' }, { status: 400 });
        }

        const xApi = new XAPI({
            consumerKey: config.x.consumerKey,
            consumerSecret: config.x.consumerSecret,
            accessToken: config.x.accessToken,
            accessTokenSecret: config.x.accessTokenSecret,
            bearerToken: config.x.bearerToken
        });

        const ai = new AIGenerator({
            gemini: config.ai.gemini,
            bytez: config.ai.bytez,
            openrouter: config.ai.openrouter,
            persona: config.bot.persona
        });

        const botSettings: BotSettings = {
            keywords: config.bot.keywords,
            intervalMinutes: config.bot.intervalMinutes,
            maxRepliesPerRun: config.bot.maxRepliesPerRun,
            avoidRetweets: config.bot.avoidRetweets,
            avoidReplies: config.bot.avoidReplies,
            isRunning: config.bot.isRunning,
            tweetSettings: config.bot.tweetSettings
        };

        const bot = new Bot(xApi, ai, botSettings);

        console.log('Manual trigger started...');
        await bot.run();

        // Check if anything was actually posted by looking at activity.json
        const activities = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'activity.json'), 'utf8'));
        const latest = activities[0];
        const wasRecent = latest && (Date.now() - new Date(latest.timestamp).getTime() < 60000);

        return NextResponse.json({
            message: wasRecent ? 'Bot run successful!' : 'Bot run finished, but nothing was posted (check logs).',
            latestTweet: wasRecent ? latest.text : null
        });
    } catch (error) {
        console.error('Manual trigger failed:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
