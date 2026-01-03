// Simple sound effects using hosted files or base64
// You can replace these URLs with your own hosted mp3 files later.

export const playSound = (type) => {
    let audio = new Audio();

    switch (type) {
        case 'success':
            // Soft Ding
            audio.src = 'https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3';
            audio.volume = 0.5;
            break;
        case 'notification':
            // Pop Sound
            audio.src = 'https://assets.mixkit.co/active_storage/sfx/2346/2346-preview.mp3';
            audio.volume = 0.4;
            break;
        case 'delete':
            // Crumple/Trash
            audio.src = 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3';
            break;
        default:
            return;
    }

    audio.play().catch(e => console.log("Audio play failed (user interaction needed first)", e));
};