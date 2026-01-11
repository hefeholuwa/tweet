import { NextResponse } from 'next/server';
import { getConfig, saveConfig, AppConfig } from '@/lib/config-helper';

export async function GET() {
    try {
        const config = getConfig();
        return NextResponse.json(config);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body: AppConfig = await request.json();
        saveConfig(body);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
    }
}
