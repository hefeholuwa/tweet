import { NextResponse } from 'next/server';
import { XAPI } from '@/lib/x-api';
import { getConfig } from '@/lib/config-helper';

export async function GET() {
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

        const userData = await xApi.authenticate();

        return NextResponse.json(userData);
    } catch (error: any) {
        console.error('Failed to fetch user data:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
