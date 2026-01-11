import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// In-memory rate limit tracking (shared across API calls in this process)
let lastKnownLimits = {
    twitter: { limited: false, resetTime: 0, message: '' },
    openrouter: { limited: false, resetTime: 0, message: '' }
};

export async function GET() {
    const now = Date.now();

    return NextResponse.json({
        twitter: {
            limited: now < lastKnownLimits.twitter.resetTime,
            resetIn: Math.max(0, Math.ceil((lastKnownLimits.twitter.resetTime - now) / 60000)),
            message: lastKnownLimits.twitter.message
        },
        openrouter: {
            limited: now < lastKnownLimits.openrouter.resetTime,
            resetIn: Math.max(0, Math.ceil((lastKnownLimits.openrouter.resetTime - now) / 60000)),
            message: lastKnownLimits.openrouter.message
        },
        timestamp: new Date().toISOString()
    });
}

export async function POST(request: Request) {
    const body = await request.json();

    if (body.service === 'twitter') {
        lastKnownLimits.twitter = {
            limited: true,
            resetTime: body.resetTime || Date.now() + 15 * 60 * 1000,
            message: body.message || 'Rate limited'
        };
    } else if (body.service === 'openrouter') {
        lastKnownLimits.openrouter = {
            limited: true,
            resetTime: body.resetTime || Date.now() + 60 * 60 * 1000,
            message: body.message || 'Rate limited'
        };
    }

    return NextResponse.json({ success: true });
}
