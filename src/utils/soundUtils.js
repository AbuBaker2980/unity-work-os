// ✅ Professional Web Audio API (No Internet/File Needed)
// We use a global variable to store the context so we don't create a new one every time.
let audioCtx = null;

export const playSound = (type = 'notification') => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;

        // 1. Singleton: Only create the AudioContext once
        if (!audioCtx) {
            audioCtx = new AudioContext();
        }

        const ctx = audioCtx;

        // 2. Autoplay Policy Fix:
        // Browsers suspend audio contexts created without user gesture.
        // We attempt to resume it. If the user hasn't clicked yet, this might still fail silently,
        // but it prevents the "not allowed to start" crash/spam in many cases.
        if (ctx.state === 'suspended') {
            ctx.resume().catch((err) => {
                // If resume fails (because no user interaction yet), we just return.
                // This prevents the red console error spam.
                return;
            });
        }

        // If context is still suspended after trying to resume, we can't play sound.
        if (ctx.state === 'suspended') return;

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        const now = ctx.currentTime;

        switch (type) {
            case 'success': // ✨ Ding!
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(500, now);
                oscillator.frequency.exponentialRampToValueAtTime(1000, now + 0.1);
                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                oscillator.start(now);
                oscillator.stop(now + 0.5);
                break;
            case 'notification': // 🔔 Pop!
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(400, now);
                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                oscillator.start(now);
                oscillator.stop(now + 0.3);
                break;
            case 'delete': // 🗑️ Thud
                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(150, now);
                oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.2);
                gainNode.gain.setValueAtTime(0.1, now);
                gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
                oscillator.start(now);
                oscillator.stop(now + 0.2);
                break;
            default: return;
        }
    } catch (error) {
        console.warn("Audio play failed:", error);
    }
};