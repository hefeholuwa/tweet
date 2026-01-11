import { XAPI } from '../src/lib/x-api';
import { AIGenerator } from '../src/lib/ai-generator';
import { Bot, BotSettings } from '../src/lib/bot';
import { getConfig } from '../src/lib/config-helper';

async function runHeadless() {
    console.log('--- Starting Headless Bot Run ---');
    const config = getConfig();

    if (!config.x.consumerKey || !config.x.accessToken) {
        console.error('Error: Missing Twitter credentials. Ensure X_CONSUMER_KEY, etc. are set in environment.');
        process.exit(1);
    }

    const xApi = new XAPI({
        consumerKey: config.x.consumerKey,
        consumerSecret: config.x.consumerSecret,
        accessToken: config.x.accessToken,
        accessTokenSecret: config.x.accessTokenSecret,
        bearerToken: config.x.bearerToken
    });

    const ai = new AIGenerator({
        bytez: config.ai.bytez,
        persona: config.bot.persona
    });

    // Forced settings for headless run:
    // 1. Ensure it reports as "running"
    // 2. Disable replies for quota safety
    const botSettings: BotSettings = {
        ...config.bot,
        isRunning: true,
        maxRepliesPerRun: 0,
    };

    const bot = new Bot(xApi, ai, botSettings);

    try {
        await bot.run();
        console.log('--- Headless Bot Run Finished Successfully ---');
    } catch (error) {
        console.error('Bot run failed:', error);
        process.exit(1);
    }
}

runHeadless().catch(err => {
    console.error('Fatal headless error:', err);
    process.exit(1);
});
