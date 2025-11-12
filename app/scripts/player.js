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

const metadata = {
    title: '',
    artist: '',
    album: '',
    artUrl: ''
};

const PAN_SECONDS = 15;
const SCALE_BASE = 1.85;
const SCALE_RANGE = 0.1;
let cursor_time = null;

function fallbackTrackTitle(file) {
    if (!file || !file.name) return 'Unknown track';
    const trimmed = file.name.trim();
    if (!trimmed) return 'Unknown track';
    const withoutExt = trimmed.replace(/\.[^/.]+$/, '');
    return withoutExt || trimmed;
}

function rand(min, max) { return Math.random() * (max - min) + min; }

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function extreme(min, max, edgeFrac = 0.3) {
    const span = max - min;
    const edge = span * edgeFrac;
    return Math.random() < 0.5
        ? min + rand(0, edge)
        : max - rand(0, edge);
}

function move() {
    const scale = clamp(SCALE_BASE + rand(-SCALE_RANGE, SCALE_RANGE), 1.2, 2);
    const coverage = Math.min((scale - 1) * 50, 50);
    const min = 50 - coverage;
    const max = 50 + coverage;

    const doedge = Math.random() < 0.8;
    const dx = doedge ? extreme(min, max) : rand(min, max);
    const dy = doedge ? extreme(min, max) : rand(min, max);
    art.style.top = dy + '%';
    art.style.left = dx + '%';
    art.style.transform = `translate(-50%,-50%) scale(${scale.toFixed(2)})`;
}

function pan_loop() {
    move();
    setInterval(move, PAN_SECONDS * 1000);
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
    audio.play().catch(err => console.warn('Autoplay blocked:', err));
    window.mediaSessionBridge?.updateMetadata({
        title: defaultTitle,
        artist: 'Unknown artist',
        album: 'Unknown album',
        artUrl: ''
    });

    jsmediatags.read(file, {
        onSuccess: tag => {
            const { title: tagTitle, artist: tagArtist, album: tagAlbum, picture } = tag.tags;
            function t(s, maxLen = 55) {
                if (!s) return '';
                s = String(s).toUpperCase();
                return s.length > maxLen ? s.slice(0, maxLen) + '…' : s;
            }

            if (tagTitle) title.textContent = t(tagTitle, 85);
            if (tagArtist) artist.textContent = t(tagArtist, 55);
            banner.style.display = 'flex';

            let artDataUrl = art.src || '';
            if (picture) {
                const base64 = calculate(picture.data);
                const mime = picture.format;
                artDataUrl = `data:${mime};base64,${base64}`;
                art.src = artDataUrl;
            }
            pan_loop();
            hide_cursor();
            window.mediaSessionBridge?.updateMetadata({
                title: tagTitle || defaultTitle,
                artist: tagArtist || 'Unknown artist',
                album: tagAlbum || 'Unknown album',
                artUrl: artDataUrl
            });
            metadata.title = tagTitle || defaultTitle;
            metadata.artist = tagArtist || 'Unknown artist';
            metadata.album = tagAlbum || 'Unknown album';
            set_media_session_metadata();

        },
        onError: err => {
            console.error('Error reading tags:', err);
            banner.style.display = 'flex';
            art.src = '';
            pan_loop();
            hide_cursor();
        }
    });
});

stage.addEventListener('click', () => {
    if (!audio.src) return;
    if (audio.paused) audio.play(); else audio.pause();
});

function reset() {
    audio.pause();
    audio.currentTime = 0;
    audio.src = '';
    uploader.style.display = 'block';
    links.style.display = 'block';
    banner.style.display = 'none';
    art.src = '';
}

function calculate(buffer) {
    let binary = '', bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return window.btoa(binary);
}

audio.addEventListener('ended', () => {
    const a = confirm('Playback ended\n\nPlay again, or choose a new file?\nClick "OK" to replay, or "Cancel" to select a new file.');
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
