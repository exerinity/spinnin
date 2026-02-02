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

const metadata = {
    title: '',
    artist: '',
    album: '',
    artUrl: ''
};

let cursor_time = null;
let pan_timer = null;

const PAN_MIN = 8;
const PAN_MAX = 22;

const SCALE_MIN = 1.25;
const SCALE_MAX = 2.4;

function rand(min, max) {
    return Math.random() * (max - min) + min;
}

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

function choice(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function extreme(min, max, edgeFrac = 0.3) {
    const span = max - min;
    const edge = span * edgeFrac;
    return Math.random() < 0.5
        ? min + rand(0, edge)
        : max - rand(0, edge);
}

function easeBezier() {
    return choice([
        'cubic-bezier(0.25, 0.1, 0.25, 1)',
        'cubic-bezier(0.2, 0.8, 0.2, 1)',
        'cubic-bezier(0.4, 0, 0.2, 1)',
        'cubic-bezier(0.1, 0.9, 0.2, 1)',
    ]);
}

function fallbackTrackTitle(file) {
    if (!file || !file.name) return 'Unknown track';
    const trimmed = file.name.trim();
    if (!trimmed) return 'Unknown track';
    return trimmed.replace(/\.[^/.]+$/, '') || trimmed;
}

function move() {
    const duration = rand(PAN_MIN, PAN_MAX);
    const scale = rand(SCALE_MIN, SCALE_MAX);

    if (Math.random() < 0.12) {
        art.style.transition = `transform 30s linear`;
        art.style.transform =
            `translate(-50%, -50%) scale(${(scale + 0.4).toFixed(2)})`;
        return scheduleNext();
    }

    const coverage = clamp((scale - 1) * 60, 20, 70);
    const min = 50 - coverage;
    const max = 50 + coverage;

    let x, y;
    const mode = Math.random();

    if (mode < 0.45) {
        x = extreme(min, max, 0.25);
        y = extreme(min, max, 0.25);
    } else if (mode < 0.75) {
        x = rand(45, 55);
        y = rand(45, 55);
    } else {
        x = rand(min, max);
        y = rand(min, max);
    }

    const ease = easeBezier();

    art.style.transition = `
        transform ${duration}s ${ease},
        top ${duration}s ${ease},
        left ${duration}s ${ease}
    `;

    art.style.top = `${y}%`;
    art.style.left = `${x}%`;
    art.style.transform =
        `translate(-50%, -50%) scale(${scale.toFixed(2)})`;

    scheduleNext(duration);
}

function scheduleNext(d = rand(PAN_MIN, PAN_MAX)) {
    clearTimeout(pan_timer);
    pan_timer = setTimeout(move, d * 1000);
}

function pan_loop() {
    move();
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

    window.mediaSessionBridge?.updateMetadata({
        title: defaultTitle,
        artist: 'Unknown artist',
        album: 'Unknown album',
        artUrl: ''
    });

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

            window.mediaSessionBridge?.updateMetadata(metadata);

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
    clearTimeout(pan_timer);
    audio.pause();
    audio.currentTime = 0;
    audio.src = '';

    uploader.style.display = 'block';
    links.style.display = 'block';
    banner.style.display = 'none';

    art.src = '';
    art.style.transition = '';
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
