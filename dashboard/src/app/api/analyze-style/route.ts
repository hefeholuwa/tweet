import { NextResponse } from 'next/server';
import { AIGenerator } from '@/lib/ai-generator';
import { getConfig } from '@/lib/config-helper';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const { pastedTweets } = await request.json();

        if (!pastedTweets || pastedTweets.trim().length < 50) {
            return NextResponse.json({
                error: 'Please paste at least a few tweets to analyze (minimum 50 characters).'
            }, { status: 400 });
        }

        console.log(`[StyleCloner] Analyzing pasted content (${pastedTweets.length} chars)...`);

        const config = getConfig();

        // Initialize AI
        const ai = new AIGenerator({
            gemini: config.ai.gemini,
            bytez: config.ai.bytez,
            openrouter: config.ai.openrouter,
            persona: config.bot.persona
        });

        // Analyze style using AI
        const styleAnalysis = await ai.analyzeWritingStyle('pasted_content', pastedTweets);

        if (!styleAnalysis) {
            return NextResponse.json({
                error: 'Failed to analyze writing style. Please try again.'
            }, { status: 500 });
        }

        console.log(`[StyleCloner] Style analysis complete`);

        return NextResponse.json({
            success: true,
            persona: styleAnalysis
        });

    } catch (error) {
        console.error('[StyleCloner] Error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
