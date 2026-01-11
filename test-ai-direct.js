const fs = require('fs');
const config = JSON.parse(fs.readFileSync('./dashboard/config.json', 'utf8'));

async function test() {
    console.log('Testing OpenRouter via fetch...');
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${config.ai.openrouter.apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: config.ai.openrouter.model,
                messages: [
                    { role: "system", content: "You are a helpful assistant." },
                    { role: "user", content: "Write a short tweet about testing a bot." }
                ]
            })
        });

        const data = await response.json();
        if (response.ok) {
            console.log('SUCCESS:', data.choices[0].message.content);
        } else {
            console.error('FAILED:', data);
        }
    } catch (e) {
        console.error('ERROR:', e.message);
    }
}

test();
