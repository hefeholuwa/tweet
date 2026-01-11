const { XAPI } = require('./dashboard/src/lib/x-api');
const { AIGenerator } = require('./dashboard/src/lib/ai-generator');
const { Bot } = require('./dashboard/src/lib/bot');
const fs = require('fs');
const path = require('path');

const config = JSON.parse(fs.readFileSync('./dashboard/config.json', 'utf8'));

async function test() {
    console.log('Testing Bot Run via direct script...');
    const xApi = new XAPI(config.x);
    const ai = new AIGenerator({
        openrouter: config.ai.openrouter,
        persona: config.bot.persona
    });
    const bot = new Bot(xApi, ai, config.bot);

    await bot.run();
    console.log('Bot run finished in test script.');
}

test().catch(console.error);
