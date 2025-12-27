const { WebcastPushConnection } = require('tiktok-live-connector');
const { WebSocketServer } = require('ws');

const PORT = 8081;
const wss = new WebSocketServer({ port: PORT });

console.log('--------------------------------------------------');
console.log('🚀 TikLink Auction Pro: Bridge Server Starting...');
console.log(`📡 WebSocket Server: ws://localhost:${PORT}`);
console.log('--------------------------------------------------');

async function connectTikTok(username, ws, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const tiktokConnection = new WebcastPushConnection(username, {
                processInitialData: false,
                enableExtendedGiftInfo: true,
                requestPollingIntervalMs: 1000
            });
            const state = await tiktokConnection.connect();

            ws.send(JSON.stringify({ type: 'status', connected: true, roomId: state.roomId }));
            console.log(`✔️ Successfully connected to @${username} (Room ID: ${state.roomId})`);

            // Event listeners
            tiktokConnection.on('gift', (gift) => {
                if (gift.diamondCount > 0) {
                    let profilePic = 'https://www.tiktok.com/favicon.ico';
                    if (gift.profilePictureUrl) {
                        profilePic = typeof gift.profilePictureUrl === 'string' 
                            ? gift.profilePictureUrl 
                            : gift.profilePictureUrl.urls?.[0] || profilePic;
                    }
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
                console.log('⚠️ TikTok connection was lost.');
                ws.send(JSON.stringify({ type: 'status', connected: false }));
            });

            tiktokConnection.on('error', (err) => {
                console.error('❌ TikTok Error:', err);
            });

            return tiktokConnection;
        } catch (err) {
            console.error(`❌ Attempt ${i+1} failed: ${err.message}`);
            if (i < retries - 1) {
                console.log('⏳ Retrying in 3 seconds...');
                await new Promise(res => setTimeout(res, 3000));
            } else {
                ws.send(JSON.stringify({ type: 'error', message: `Failed to connect to @${username}: ${err.message}` }));
            }
        }
    }
    return null;
}

wss.on('connection', (ws) => {
    console.log('✅ Dashboard connected to bridge.');
    let tiktokConnection = null;

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'SET_USERNAME') {
                const username = 'elyas1121';
                console.log(`🔗 Attempting connection to TikTok Live: @${username}`);

                if (tiktokConnection) {
                    try { tiktokConnection.disconnect(); } catch (e) {}
                }

                tiktokConnection = await connectTikTok(username, ws);
            }
        } catch (e) {
            console.error('❌ Error processing message from dashboard:', e.message);
        }
    });

    ws.on('close', () => {
        console.log('❌ Dashboard disconnected. Closing TikTok bridge.');
        if (tiktokConnection) {
            try { tiktokConnection.disconnect(); } catch (e) {}
        }
    });
});
