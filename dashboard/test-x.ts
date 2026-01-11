import { XAPI } from './src/lib/x-api';
import fs from 'fs';

async function test() {
    const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    const xApi = new XAPI(config.x);

    try {
        console.log('--- Twitter API Diagnostics ---');
        console.log('Checking account info...');
        const user = await xApi.client.v2.me();
        console.log('Connected as:', user.data.username);
        console.log('API Status: OK');
    } catch (error: any) {
        console.error('API Error:', error.message || error);
        if (error.data) console.error('Error Data:', JSON.stringify(error.data, null, 2));
    }
}

test();
