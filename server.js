/**
 * TikLink Auction Pro
 * FINAL – حساب كل الهدايا بقيمتها الحقيقية بدون تكرار
 */

const { WebcastPushConnection } = require('tiktok-live-connector');
const { WebSocketServer } = require('ws');

const PORT = 8090;
const TIKTOK_USERNAME = 'elyas1121';

// ⏱️ قفل زمني لمنع التكرار
const TIME_LOCK_MS = 400;

// WebSocket Server
const wss = new WebSocketServer({ port: PORT });

// 🧠 آخر هدية لكل مستخدم
const lastGiftTime = new Map();

console.log('-------------------------------------------');
console.log('🚀 TikLink Auction Pro - FINAL');
console.log(`📡 WS: ws://localhost:${PORT}`);
console.log(`🎯 TikTok: @${TIKTOK_USERNAME}`);
console.log('-------------------------------------------');

async function connectTikTok(ws) {
    const tiktok = new WebcastPushConnection(TIKTOK_USERNAME, {
        processInitialData: false,
        enableExtendedGiftInfo: true
    });

    try {
        await tiktok.connect();
        console.log('✔️ LIVE CONNECTED');

        ws.send(JSON.stringify({
            type: 'status',
            connected: true
        }));
    } catch (err) {
        console.log('❌ NOT LIVE');
        ws.send(JSON.stringify({
            type: 'status',
            connected: false
        }));
        return null;
    }

    // 🎁 GIFTS — الحساب الصحيح النهائي
    tiktok.on('gift', (gift) => {
        if (!gift || !gift.diamondCount) return;

        // ⛔ تجاهل تحديثات الستريك (نحسب عند النهاية فقط)
        if (gift.repeatEnd === false) return;

        const now = Date.now();
        const lastTime = lastGiftTime.get(gift.userId) || 0;

        // ⛔ منع التكرار
        if (now - lastTime < TIME_LOCK_MS) return;

        lastGiftTime.set(gift.userId, now);

        // تنظيف الذاكرة
        if (lastGiftTime.size > 1000) lastGiftTime.clear();

        // ✅ الحساب الحقيقي
        let coins = gift.diamondCount;

        // لو كانت ستريك نحسب القيمة الكاملة مرة وحدة
        if (gift.repeatCount && gift.repeatCount > 1) {
            coins = gift.diamondCount * gift.repeatCount;
        }

        console.log(
            `🎁 ${gift.nickname} | ${gift.giftName} → ${coins} 💎`
        );

        ws.send(JSON.stringify({
            type: 'gift',
            userId: gift.userId,
            uniqueId: gift.uniqueId,
            nickname: gift.nickname,
            giftName: gift.giftName,
            coins
        }));
    });

    tiktok.on('disconnected', () => {
        console.log('⚠️ TIKTOK DISCONNECTED');
        lastGiftTime.clear();
        ws.send(JSON.stringify({
            type: 'status',
            connected: false
        }));
    });

    return tiktok;
}

// 🌐 WebSocket Connections
wss.on('connection', async (ws) => {
    console.log('✅ Dashboard Connected');
    let tiktok = null;

    ws.on('message', async (msg) => {
        let data;
        try {
            data = JSON.parse(msg);
        } catch {
            return;
        }

        if (data.type === 'connect') {
            if (!tiktok) {
                tiktok = await connectTikTok(ws);
            }
        }

        if (data.type === 'disconnect') {
            if (tiktok) {
                tiktok.disconnect();
                tiktok = null;
            }
        }
    });

    ws.on('close', () => {
        if (tiktok) tiktok.disconnect();
    });
});
