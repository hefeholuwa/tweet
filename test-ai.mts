import { AIGenerator } from './dashboard/src/lib/ai-generator';
import fs from 'fs';
import path from 'path';

const config = JSON.parse(fs.readFileSync('./dashboard/config.json', 'utf8'));

async function test() {
    console.log('Testing AI Generation...');
    const ai = new AIGenerator({
        openrouter: config.ai.openrouter,
        persona: config.bot.persona
    });

    const tweet = await ai.generateOriginalTweet('testing my twitter bot');
    console.log('Generated Tweet:', tweet);
}

test().catch(console.error);
