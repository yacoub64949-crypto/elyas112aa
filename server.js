const { WebcastPushConnection } = require('tiktok-live-connector');
const { WebSocketServer } = require('ws');

const PORT = 8081;
const wss = new WebSocketServer({ port: PORT });

console.log('--------------------------------------------------');
console.log('🚀 TikLink Auction Pro: Bridge Server Starting...');
console.log(`📡 WebSocket Server: ws://localhost:${PORT}`);
console.log('--------------------------------------------------');

wss.on('connection', (ws) => {
    console.log('✅ Dashboard connected to bridge.');
    let tiktokConnection = null;

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);

            // السماح فقط بالاتصال باسم elyas1121
            if (data.type === 'SET_USERNAME') {
                const username = 'elyas1121'; // حصر الاتصال بالمستخدم هذا
                console.log(`🔗 Connecting to TikTok Live: @${username}`);

                // Clean up any existing connection
                if (tiktokConnection) {
                    try {
                        tiktokConnection.disconnect();
                    } catch (e) {}
                }

                // Create new connection
                tiktokConnection = new WebcastPushConnection(username, {
                    processInitialData: false,
                    enableExtendedGiftInfo: true,
                    requestPollingIntervalMs: 1000
                });

                // Connect to TikTok
                tiktokConnection.connect().then(state => {
                    console.log(`✔️ Successfully connected to @${username} (Room ID: ${state.roomId})`);
                    ws.send(JSON.stringify({ type: 'status', connected: true, roomId: state.roomId }));
                }).catch(err => {
                    console.error('❌ TikTok Connection Failed:', err.message);
                    ws.send(JSON.stringify({ type: 'error', message: `Failed to connect to @${username}: ${err.message}` }));
                });

                // --- EVENT LISTENERS ---

                tiktokConnection.on('gift', (gift) => {
                    if (gift.diamondCount > 0) {
                        console.log(`🎁 Gift: ${gift.nickname} sent ${gift.diamondCount} coins (${gift.giftName})`);
                        
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
            }
        } catch (e) {
            console.error('❌ Error processing message from dashboard:', e.message);
        }
    });

    ws.on('close', () => {
        console.log('❌ Dashboard disconnected. Closing TikTok bridge.');
        if (tiktokConnection) {
            try {
                tiktokConnection.disconnect();
            } catch (e) {}
        }
    });
});
