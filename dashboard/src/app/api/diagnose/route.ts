import { NextResponse } from 'next/server';
import { AIGenerator } from '@/lib/ai-generator';
import { getConfig } from '@/lib/config-helper';

export const dynamic = 'force-dynamic';

export async function POST() {
    const logs: string[] = [];
    const log = (msg: string) => {
        console.log(msg);
        logs.push(`${new Date().toISOString()} - ${msg}`);
    };

    try {
        log('🚀 AI DIAGNOSTIC STARTED');
        const config = getConfig();

        // AI Generation Test Only
        log('🤖 Testing AI generation...');
        log(`📊 AI Config: Bytez=${config.ai.bytez?.enabled ? 'ON' : 'OFF'}, Model=${config.ai.bytez?.model || 'default'}`);

        const ai = new AIGenerator({
            gemini: config.ai.gemini,
            bytez: config.ai.bytez,
            openrouter: config.ai.openrouter,
            persona: config.bot.persona
        });

        const testTopic = config.bot.tweetSettings.topics[0] || 'technology';
        log(`📝 Generating tweet for topic: "${testTopic}"`);

        const startTime = Date.now();
        const generatedTweet = await ai.generateOriginalTweet(testTopic);
        const duration = Date.now() - startTime;

        if (generatedTweet) {
            log(`✅ AI generated in ${duration}ms: "${generatedTweet}"`);
            log(`📏 Length: ${generatedTweet.length} characters`);
        } else {
            log('❌ AI returned null');
        }

        log('🏁 DIAGNOSTIC COMPLETE');
        return NextResponse.json({
            message: 'Diagnostic complete',
            tweet: generatedTweet,
            logs
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        log(`💥 ERROR: ${message}`);
        return NextResponse.json({ error: message, logs }, { status: 500 });
    }
}
