document.addEventListener('keydown', (e) => {
    const t = e.target;
    const tag = t && t.tagName ? t.tagName.toLowerCase() : '';

    if (
        (t && t.isContentEditable) ||
        tag === 'input' || tag === 'textarea' || tag === 'select' ||
        (t && t.closest && t.closest('[role="textbox"], [contenteditable="true"]'))
    ) return;

    const player = document.getElementById('player');
    if (!player || !player.src) return;

    const scrub = (amount) => {
        const dur = player.duration;
        if (!Number.isFinite(dur)) return;
        player.currentTime = Math.max(0, Math.min(dur, player.currentTime + amount));
    };

    const jumpToPercent = (percent) => {
        const dur = player.duration || 0;
        player.currentTime = dur * percent;
    };

    switch (e.code) {
        case 'Space':
        case 'KeyK':
            e.preventDefault();
            player.paused ? player.play() : player.pause();
            break;

        case 'KeyR':
            if (!e.ctrlKey) {
                e.preventDefault();
                player.currentTime = 0;
            }
            break;

        case 'ArrowLeft':
        case 'KeyJ':
        case 'KeyA':
            e.preventDefault();
            if (e.altKey) scrub(-30);
            else if (e.shiftKey) scrub(-1);
            else if (e.ctrlKey) scrub(-5);
            else scrub(-10);
            break;

        case 'ArrowRight':
        case 'KeyL':
        case 'KeyD':
            e.preventDefault();
            if (e.altKey) scrub(30);
            else if (e.shiftKey) scrub(1);
            else if (e.ctrlKey) scrub(5);
            else scrub(10);
            break;

        default:
            if (e.code.startsWith('Digit')) {
                const num = parseInt(e.code.slice(5), 10);
                if (!isNaN(num)) {
                    e.preventDefault();
                    let perc = num === 0 ? (e.shiftKey ? 1 : 0) : num * 0.1;
                    if (e.shiftKey) perc = Math.max(0, perc - 0.05);
                    jumpToPercent(perc);
                }
            }
            break;
    }
});
