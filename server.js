/**
 * TikLink Auction Pro - TikTok Live Bridge (FIXED USER)
 * Connects automatically to @elyas1121
 * npm install tiktok-live-connector ws
 */

const { WebcastPushConnection } = require('tiktok-live-connector');
const { WebSocketServer } = require('ws');

const PORT = 8081;
const TIKTOK_USERNAME = 'elyas1121';

const wss = new WebSocketServer({ port: PORT });

console.log('--------------------------------------------------');
console.log('🚀 TikLink Auction Pro: Bridge Server Starting...');
console.log(`📡 WebSocket Server: ws://localhost:${PORT}`);
console.log(`🎯 TikTok Auto-Connect: @${TIKTOK_USERNAME}`);
console.log('--------------------------------------------------');

async function connectTikTok(ws, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const tiktokConnection = new WebcastPushConnection(TIKTOK_USERNAME, {
                processInitialData: false,
                enableExtendedGiftInfo: true,
                requestPollingIntervalMs: 1000
            });

            const state = await tiktokConnection.connect();

            console.log(`✔️ Connected to @${TIKTOK_USERNAME} (Room ID: ${state.roomId})`);

            ws.send(JSON.stringify({
                type: 'status',
                connected: true,
                username: TIKTOK_USERNAME,
                roomId: state.roomId
            }));

            // 🎁 Gifts
            tiktokConnection.on('gift', (gift) => {
                if (gift.diamondCount > 0) {
                    const profilePic =
                        typeof gift.profilePictureUrl === 'string'
                            ? gift.profilePictureUrl
                            : gift.profilePictureUrl?.urls?.[0] ||
                              'https://www.tiktok.com/favicon.ico';

                    ws.send(JSON.stringify({
                        type: 'gift',
                        userId: gift.userId,
                        uniqueId: gift.uniqueId,
                        nickname: gift.nickname,
                        profilePictureUrl: profilePic,
                        diamondCount: gift.diamondCount,
                        giftName: gift.giftName,
                        repeatCount: gift.repeatCount
                    }));
                }
            });

            tiktokConnection.on('disconnected', () => {
                console.log('⚠️ TikTok disconnected');
                ws.send(JSON.stringify({ type: 'status', connected: false }));
            });

            tiktokConnection.on('error', (err) => {
                console.error('❌ TikTok Error:', err.message);
            });

            return tiktokConnection;

        } catch (err) {
            console.error(`❌ Attempt ${i + 1} failed: ${err.message}`);
            if (i < retries - 1) {
                await new Promise(res => setTimeout(res, 3000));
            } else {
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Failed to connect to TikTok Live'
                }));
            }
        }
    }
    return null;
}

wss.on('connection', async (ws) => {
    console.log('✅ Dashboard connected');
    let tiktokConnection = null;

    // 🔥 اتصال تلقائي بدون أي رسالة
    tiktokConnection = await connectTikTok(ws);

    ws.on('close', () => {
        console.log('❌ Dashboard disconnected');
        if (tiktokConnection) {
            try { tiktokConnection.disconnect(); } catch (e) {}
        }
    });
});
