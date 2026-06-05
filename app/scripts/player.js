if (/Mobi|Android/i.test(navigator.userAgent)) {
    document.body.innerHTML = `This app is not supported on mobile devices. Request desktop site if you'd still like to continue.`;
}

const stage = document.getElementById('stage');
const uploader = document.getElementById('uploader');
const art = document.getElementById('art');
const banner = document.getElementById('banner');
const artist = document.getElementById('artist');
const title = document.getElementById('title');
const audio = document.getElementById('player');
const links = document.getElementById('links');
const outnow = document.getElementById('outnow');

const OG = ' (Original Mix)';
const MIN_EFFECT_INTENSITY = 0.2;
const MAX_EFFECT_INTENSITY = 5;

const metadata = {
    title: '',
    artist: '',
    album: '',
    artUrl: ''
};

let cursor_time = null;
let effectIntensity = 2;

const PAN_MIN = 10;
const PAN_MAX = 20;

const SCALE_MIN = 1.15;
const SCALE_MAX = 2.2;

function rand(min, max) {
    return Math.random() * (max - min) + min;
}

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

const kb = {
    x: 50, y: 50, scale: SCALE_MIN,
    sx: 50, sy: 50, sscale: SCALE_MIN,
    tx: 50, ty: 50, tscale: SCALE_MIN,
    progress: 0,
    duration: 14,
    raf: null,
    lastTime: null
};

function newKBTarget() {
    const scale = rand(SCALE_MIN, SCALE_MAX);
    const xCoverage = Math.min((scale * 1.2 - 1) * 50, 47);
    const yCoverage = Math.min(xCoverage * 1.5, 47);
    return {
        x: clamp(rand(50 - xCoverage, 50 + xCoverage), 2, 98),
        y: clamp(rand(50 - yCoverage, 50 + yCoverage), 2, 98),
        scale
    };
}

function kenBurnsFrame(timestamp) {
    if (!kb.lastTime) kb.lastTime = timestamp;
    const dt = (timestamp - kb.lastTime) / 1000;
    kb.lastTime = timestamp;

    kb.progress += dt / kb.duration;

    if (kb.progress >= 1) {
        kb.progress = 0;
        kb.sx = kb.tx;
        kb.sy = kb.ty;
        kb.sscale = kb.tscale;
        const t = newKBTarget();
        kb.tx = t.x; kb.ty = t.y; kb.tscale = t.scale;
        kb.duration = rand(PAN_MIN, PAN_MAX) / effectIntensity;
    }

    const e = easeInOut(kb.progress);
    kb.x = lerp(kb.sx, kb.tx, e);
    kb.y = lerp(kb.sy, kb.ty, e);
    kb.scale = lerp(kb.sscale, kb.tscale, e);

    art.style.left = `${kb.x.toFixed(3)}%`;
    art.style.top = `${kb.y.toFixed(3)}%`;
    art.style.transform = `translate(-50%, -50%) scale(${kb.scale.toFixed(4)})`;

    kb.raf = requestAnimationFrame(kenBurnsFrame);
}

function fallbackTrackTitle(file) {
    if (!file || !file.name) return 'Unknown track';
    const trimmed = file.name.trim();
    if (!trimmed) return 'Unknown track';
    return trimmed.replace(/\.[^/.]+$/, '') || trimmed;
}

function pan_loop() {
    if (kb.raf) cancelAnimationFrame(kb.raf);
    kb.lastTime = null;
    kb.progress = 0;

    kb.sx = kb.x; kb.sy = kb.y; kb.sscale = kb.scale;
    const t = newKBTarget();
    kb.tx = t.x; kb.ty = t.y; kb.tscale = t.scale;
    kb.duration = rand(PAN_MIN, PAN_MAX) / effectIntensity;

    art.style.transition = 'none';
    kb.raf = requestAnimationFrame(kenBurnsFrame);
}

function hide_cursor() {
    clearTimeout(cursor_time);
    document.body.classList.remove('hide-cursor');
    stage.classList.remove('hide-cursor');

    cursor_time = setTimeout(() => {
        document.body.classList.add('hide-cursor');
        stage.classList.add('hide-cursor');
    }, 3000);
}
document.addEventListener('mousemove', hide_cursor);

uploader.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;

    const defaultTitle = fallbackTrackTitle(file);

    uploader.style.display = 'none';
    links.style.display = 'none';

    audio.controls = false;
    audio.src = URL.createObjectURL(file);
    audio.autoplay = true;
    audio.muted = false;
    audio.play().catch(() => {});

    metadata.title = defaultTitle;
    metadata.artist = 'Unknown artist';
    metadata.album = 'Unknown album';
    metadata.artUrl = '';
    set_media_session_metadata();

    document.title = `${defaultTitle} / Spinnin' Records player`;

    jsmediatags.read(file, {
        onSuccess: tag => {
            const { title: tTitle, artist: tArtist, album, picture } = tag.tags;

            function t(s, max = 55) {
                if (!s) return '';
                s = String(s).toUpperCase();
                return s.length > max ? s.slice(0, max) + '…' : s;
            }

            if (tTitle) title.textContent = t(tTitle, 85);
            if (tArtist) artist.textContent = t(tArtist, 55);

            banner.style.display = 'flex';

            let artDataUrl = '';

            if (picture) {
                const base64 = calculate(picture.data);
                artDataUrl = `data:${picture.format};base64,${base64}`;
                art.src = artDataUrl;
            } else {
                art.src = '';
            }

            metadata.title = tTitle || defaultTitle;
            metadata.artist = tArtist || 'Unknown artist';
            metadata.album = album || 'Unknown album';
            metadata.artUrl = artDataUrl;
            set_media_session_metadata();

            pan_loop();
            hide_cursor();
        },

        onError: err => {
            console.error('Tag error:', err);
            banner.style.display = 'flex';
            art.src = '';
            pan_loop();
            hide_cursor();
        }
    });
});

stage.addEventListener('click', () => {
    if (!audio.src) return;
    audio.paused ? audio.play() : audio.pause();
});

function reset() {
    if (kb.raf) { cancelAnimationFrame(kb.raf); kb.raf = null; }
    kb.lastTime = null;
    kb.x = 50; kb.y = 50; kb.scale = SCALE_MIN;

    audio.pause();
    audio.currentTime = 0;
    audio.src = '';

    uploader.style.display = 'block';
    links.style.display = 'block';
    banner.style.display = 'none';

    art.src = '';
    art.style.transition = '';
    art.style.transform = '';
}

function calculate(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

audio.addEventListener('ended', () => {
    const a = confirm(
        'Playback ended\n\nPlay again, or choose a new file?\n' +
        'OK = replay, Cancel = new file'
    );

    if (a) {
        audio.currentTime = 0;
        audio.play();
    } else {
        reset();
    }
});

outnow.addEventListener('click', () => {
    if (confirm('Reset?')) reset();
});

title.addEventListener('click', e => {
    e.stopPropagation();
    const current = title.textContent || '';
    if (!current) return;

    if (current.endsWith(OG)) {
        title.textContent = current.slice(0, -OG.length);
    } else {
        title.textContent = current + OG;
    }
});



artist.addEventListener('click', e => {
    e.stopPropagation();    const input = prompt(`Set animation intensity (${MIN_EFFECT_INTENSITY} - ${MAX_EFFECT_INTENSITY})`, String(effectIntensity));
    if (input === null) return;

    const value = parseFloat(input);
    if (Number.isNaN(value)) {
        alert('Invalid number');
        return;
    }

    effectIntensity = clamp(value, MIN_EFFECT_INTENSITY, MAX_EFFECT_INTENSITY);
    pan_loop();
});