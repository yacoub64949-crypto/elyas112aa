
/**
 * TikLink Auction Pro - Ultra Precision Bridge V5
 * سيرفر معزز بنظام حماية الحساب واحتساب دقيق للهدايا.
 */

const { WebcastPushConnection } = require('tiktok-live-connector');
const { WebSocketServer } = require('ws');

const PORT = 8081;
const wss = new WebSocketServer({ port: PORT });

// اسم المستخدم المصرح له فقط
const AUTHORIZED_USER = 'elyas1121';

console.log('\x1b[36m%s\x1b[0m', '==================================================');
console.log('\x1b[32m%s\x1b[0m', '   🚀 TIKLINK AUCTION BRIDGE: ACTIVE');
console.log('\x1b[33m%s\x1b[0m', '   📡 MODE: REAL-TIME 1:1 CALCULATION');
console.log('\x1b[37m%s\x1b[0m', `   📡 STATUS: WAITING FOR CONNECTIONS`);
console.log('\x1b[36m%s\x1b[0m', '==================================================');

wss.on('connection', (ws) => {
    let tiktokConnection = null;
    const streakMemory = new Map();

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);

            if (data.type === 'SET_USERNAME') {
                const username = data.username.trim().replace('@', '').toLowerCase();
                if (!username) return;

                // التحقق من صلاحية المستخدم (Security Check)
                if (username !== AUTHORIZED_USER) {
                    console.log(`\x1b[31m[DENIED]\x1b[0m Access denied for user: @${username} (Not Paid)`);
                    ws.send(JSON.stringify({ 
                        type: 'error', 
                        message: 'لم تدفع الرسوم 💰' 
                    }));
                    return;
                }

                console.log(`\x1b[34m[SYS]\x1b[0m Linking to authorized user: @${username}...`);

                if (tiktokConnection) {
                    try { tiktokConnection.disconnect(); } catch (e) {}
                }

                tiktokConnection = new WebcastPushConnection(username, {
                    processInitialData: false,
                    enableExtendedGiftInfo: true,
                    requestPollingIntervalMs: 800,
                    clientParams: {
                        "app_language": "ar-SA",
                        "device_platform": "web",
                        "browser_name": "chrome"
                    }
                });

                tiktokConnection.connect().then(state => {
                    console.log(`\x1b[32m[OK]\x1b[0m Successfully connected to @${username}`);
                    ws.send(JSON.stringify({ type: 'status', connected: true, roomId: state.roomId }));
                }).catch(err => {
                    console.log(`\x1b[31m[FAIL]\x1b[0m Connection error: ${err.message}`);
                    ws.send(JSON.stringify({ type: 'error', message: 'تأكد من اليوزر ومن تشغيل البث!' }));
                });

                tiktokConnection.on('gift', (gift) => {
                    if (gift.diamondCount > 0) {
                        const streakId = `${gift.userId}_${gift.giftId}`;
                        const repeatCount = gift.repeatCount || 1;
                        const currentTotalValue = gift.diamondCount * repeatCount;
                        const previouslySent = streakMemory.get(streakId) || 0;
                        const netIncrement = currentTotalValue - previouslySent;

                        if (netIncrement > 0) {
                            streakMemory.set(streakId, currentTotalValue);
                            
                            const timestamp = new Date().toLocaleTimeString();
                            console.log(`\x1b[37m[${timestamp}]\x1b[0m \x1b[32mGIFT:\x1b[0m \x1b[1m${gift.nickname}\x1b[0m sent \x1b[33m${netIncrement}\x1b[0m coins`);

                            let profilePic = 'https://www.tiktok.com/favicon.ico';
                            if (gift.profilePictureUrl) {
                                profilePic = typeof gift.profilePictureUrl === 'string' 
                                    ? gift.profilePictureUrl 
                                    : (gift.profilePictureUrl.urls?.[0] || profilePic);
                            }

                            ws.send(JSON.stringify({
                                type: 'gift',
                                userId: gift.userId,
                                nickname: gift.nickname,
                                profilePictureUrl: profilePic,
                                diamondCount: netIncrement
                            }));

                            if (gift.repeatEnd) {
                                setTimeout(() => streakMemory.delete(streakId), 5000);
                            }
                        }
                    }
                });

                tiktokConnection.on('disconnected', () => {
                    console.log(`\x1b[31m[OFF]\x1b[0m Disconnected from TikTok.`);
                    ws.send(JSON.stringify({ type: 'status', connected: false }));
                });
            }
        } catch (e) {
            console.log(`\x1b[31m[CRIT]\x1b[0m Error: ${e.message}`);
        }
    });

    ws.on('close', () => {
        if (tiktokConnection) try { tiktokConnection.disconnect(); } catch (e) {}
        streakMemory.clear();
    });
});
