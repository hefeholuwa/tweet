import { XAPI } from '../src/lib/x-api';
import { AIGenerator } from '../src/lib/ai-generator';
import { Bot, BotSettings } from '../src/lib/bot';
import { getConfig, AppConfig } from '../src/lib/config-helper';

async function runIteration() {
    const config = getConfig();

    if (!config.bot.isRunning) {
        console.log('Bot is currently disabled in settings. Skipping iteration.');
        return;
    }

    if (!config.x.consumerKey || !config.x.accessToken) {
        console.error('Error: Missing Twitter credentials in config.json');
        return;
    }

    console.log('--- Starting Bot Iteration ---');

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
        tweetSettings: config.bot.tweetSettings,
    };

    const bot = new Bot(xApi, ai, botSettings);

    try {
        await bot.run();
    } catch (error) {
        console.error('Bot run failed:', error);
    }
}

async function main() {
    console.log('--- Obsidian Intelligence Worker Started ---');
    console.log('Poller active: checking state every 60 seconds.');

    let lastRunTime = 0;

    // Check every minute
    setInterval(async () => {
        const config = getConfig();
        const now = Date.now();
        const intervalMs = (config.bot.intervalMinutes || 30) * 60 * 1000;

        if (!config.bot.isRunning) {
            return; // Bot is off, do nothing
        }

        // If it's time to run (or if we've never run and bot just started)
        if (now - lastRunTime >= intervalMs) {
            console.log(`[Scheduler] Interval reached (${config.bot.intervalMinutes}m). Triggering iteration...`);
            lastRunTime = now;
            await runIteration();
        }
    }, 1000 * 60);

    // Immediate first run if enabled
    const initialConfig = getConfig();
    if (initialConfig.bot.isRunning) {
        console.log('[Scheduler] Bot is active. Performing initial run...');
        lastRunTime = Date.now();
        await runIteration();
    }
}

main().catch(error => {
    console.error('Fatal worker error:', error);
    process.exit(1);
});
