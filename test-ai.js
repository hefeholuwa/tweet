const OpenAI = require('openai');
const fs = require('fs');

const config = JSON.parse(fs.readFileSync('./dashboard/config.json', 'utf8'));

const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: config.ai.openrouter.apiKey,
});

async function test() {
    console.log('Testing AI Generation directly via OpenAI SDK...');
    try {
        const response = await client.chat.completions.create({
            model: config.ai.openrouter.model || 'meta-llama/llama-3.2-3b-instruct:free',
            messages: [
                { role: 'system', content: 'You are a helpful assistant.' },
                { role: 'user', content: 'Write a short tweet about testing a bot.' }
            ],
        });
        console.log('Generated Tweet:', response.choices[0].message.content);
    } catch (e) {
        console.error('FAILED:', e.message);
    }
}

test();
