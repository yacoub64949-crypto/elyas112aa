/**
 * TikLink Auction Pro - Node.js Backend Bridge
 * Auto connect to TikTok Live @elyas1121
 * Values preserved exactly as sent by TikTok
 * npm install tiktok-live-connector ws
 */

const { WebcastPushConnection } = require('tiktok-live-connector');
const { WebSocketServer } = require('ws');

const PORT = 8081;
const TIKTOK_USERNAME = 'elyas1121';
const RETRY_COUNT = 3;
const RETRY_DELAY_MS = 3000;

const wss = new WebSocketServer({ port: PORT });

console.log('--------------------------------------------------');
console.log('🚀 TikLink Auction Pro: Bridge Server Starting...');
console.log(`📡 WebSocket Server: ws://localhost:${PORT}`);
console.log(`🎯 TikTok Auto-Connect: @${TIKTOK_USERNAME}`);
console.log('--------------------------------------------------');

async function connectTikTok(ws, retries = RETRY_COUNT) {
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

            // 🎁 Gifts (كل شيء بقيمته الأصلية، بدون فلترة)
            tiktokConnection.on('gift', (gift) => {
                if (!gift) return;

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
                    giftName: gift.giftName,
                    repeatCount: gift.repeatCount,
                    diamondCount: gift.diamondCount // 🔥 قيمتها الأصلية كما أرسلها تيك توك
                }));
            });

            tiktokConnection.on('disconnected', () => {
                console.log('⚠️ TikTok disconnected');
                ws.send(JSON.stringify({ type: 'status', connected: false }));
            });

            tiktokConnection.on('error', (err) => {
                console.error('❌ TikTok Error:', err.message);
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'حدث خطأ في الاتصال مع TikTok'
                }));
            });

            return tiktokConnection;

        } catch (err) {
            console.error(`❌ Attempt ${i + 1} failed: ${err.message}`);
            if (i < retries - 1) {
                await new Promise(res => setTimeout(res, RETRY_DELAY_MS));
            } else {
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'فشل الاتصال بالبث'
                }));
            }
        }
    }
    return null;
}

// 🌐 WebSocket
wss.on('connection', async (ws) => {
    console.log('✅ Dashboard connected');
    let tiktokConnection = null;

    // 🔥 اتصال تلقائي
    tiktokConnection = await connectTikTok(ws);

    ws.on('close', () => {
        console.log('❌ Dashboard disconnected');
        if (tiktokConnection) {
            try { tiktokConnection.disconnect(); } catch (e) {}
        }
    });
});
