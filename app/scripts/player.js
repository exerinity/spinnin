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
    art_url: ''
};

let cursor_time = null;
let effect_intensity = 2;

const PAN_MIN = 10;
const PAN_MAX = 20;

const SCALE_MIN = 1;
const SCALE_MAX = 2.35;

function rand(min, max) {
    return Math.random() * (max - min) + min;
}

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

function ease_in_out(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

let art_base_size = 0;

const kb = {
    pan_x: 0, pan_y: 0, scale: SCALE_MIN,
    span_x: 0, span_y: 0, sscale: SCALE_MIN,
    tpan_x: 0, tpan_y: 0, tscale: SCALE_MIN,
    progress: 0,
    duration: 14,
    raf: null,
    last_time: null
};

function stage_size() {
    return { w: window.innerWidth, h: window.innerHeight };
}

function sync_art_base_size() {
    const { w, h } = stage_size();
    art_base_size = Math.max(w, h);
    art.style.width = `${art_base_size}px`;
    art.style.height = `${art_base_size}px`;
}

function pan_limits(scale) {
    const { w, h } = stage_size();
    const side = art_base_size * scale;
    return {
        max_x: Math.max(0, (side - w) / 2),
        max_y: Math.max(0, (side - h) / 2)
    };
}

function clamp_pan(pan_x, pan_y, scale) {
    const { max_x, max_y } = pan_limits(scale);
    return {
        pan_x: clamp(pan_x, -max_x, max_x),
        pan_y: clamp(pan_y, -max_y, max_y)
    };
}

function apply_art_transform(pan_x, pan_y, scale) {
    const p = clamp_pan(pan_x, pan_y, scale);
    art.style.transform =
        `translate(-50%, -50%) translate(${p.pan_x.toFixed(2)}px, ${p.pan_y.toFixed(2)}px) scale(${scale.toFixed(4)})`;
}

function new_kb_target() {
    const scale = rand(SCALE_MIN, SCALE_MAX);
    const { max_x, max_y } = pan_limits(scale);
    const pick_axis = max => {
        if (max <= 0) return 0;
        if (Math.random() < 0.35) {
            return Math.random() < 0.5 ? -max : max;
        }
        return rand(-max, max);
    };
    return {
        pan_x: pick_axis(max_x),
        pan_y: pick_axis(max_y),
        scale
    };
}

function ken_burns_frame(timestamp) {
    if (!kb.last_time) kb.last_time = timestamp;
    const dt = (timestamp - kb.last_time) / 1000;
    kb.last_time = timestamp;

    kb.progress += dt / kb.duration;

    if (kb.progress >= 1) {
        kb.progress = 0;
        kb.span_x = kb.tpan_x;
        kb.span_y = kb.tpan_y;
        kb.sscale = kb.tscale;
        const t = new_kb_target();
        kb.tpan_x = t.pan_x;
        kb.tpan_y = t.pan_y;
        kb.tscale = t.scale;
        kb.duration = rand(PAN_MIN, PAN_MAX) / effect_intensity;
    }

    const e = ease_in_out(kb.progress);
    kb.pan_x = lerp(kb.span_x, kb.tpan_x, e);
    kb.pan_y = lerp(kb.span_y, kb.tpan_y, e);
    kb.scale = lerp(kb.sscale, kb.tscale, e);

    apply_art_transform(kb.pan_x, kb.pan_y, kb.scale);

    kb.raf = requestAnimationFrame(ken_burns_frame);
}

function fallback_track_title(file) {
    if (!file || !file.name) return 'Unknown track';
    const trimmed = file.name.trim();
    if (!trimmed) return 'Unknown track';
    return trimmed.replace(/\.[^/.]+$/, '') || trimmed;
}

function pan_loop() {
    if (!art.src) return;
    sync_art_base_size();

    if (kb.raf) cancelAnimationFrame(kb.raf);
    kb.last_time = null;
    kb.progress = 0;

    kb.span_x = kb.pan_x;
    kb.span_y = kb.pan_y;
    kb.sscale = kb.scale;
    const t = new_kb_target();
    kb.tpan_x = t.pan_x;
    kb.tpan_y = t.pan_y;
    kb.tscale = t.scale;
    kb.duration = rand(PAN_MIN, PAN_MAX) / effect_intensity;

    art.style.transition = 'none';
    apply_art_transform(kb.pan_x, kb.pan_y, kb.scale);
    kb.raf = requestAnimationFrame(ken_burns_frame);
}

function start_art_animation() {
    const run = () => {
        sync_art_base_size();
        kb.pan_x = 0;
        kb.pan_y = 0;
        kb.scale = SCALE_MIN;
        apply_art_transform(0, 0, SCALE_MIN);
        pan_loop();
    };

    if (art.complete && art.naturalWidth > 0) {
        run();
    } else {
        art.onload = () => {
            art.onload = null;
            run();
        };
    }
}

window.addEventListener('resize', () => {
    if (!art.src) return;
    sync_art_base_size();
    apply_art_transform(kb.pan_x, kb.pan_y, kb.scale);
});

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

    const default_title = fallback_track_title(file);

    uploader.style.display = 'none';
    links.style.display = 'none';

    audio.controls = false;
    audio.src = URL.createObjectURL(file);
    audio.autoplay = true;
    audio.muted = false;
    audio.play().catch(() => {});

    metadata.title = default_title;
    metadata.artist = 'Unknown artist';
    metadata.album = 'Unknown album';
    metadata.art_url = '';
    set_media_session_metadata();

    document.title = `${default_title} / Spinnin' Records player`;

    jsmediatags.read(file, {
        onSuccess: tag => {
            const { title: tag_title, artist: tag_artist, album, picture } = tag.tags;

            function t(s, max = 55) {
                if (!s) return '';
                s = String(s).toUpperCase();
                return s.length > max ? s.slice(0, max) + '...' : s;
            }

            if (tag_title) title.textContent = t(tag_title, 85);
            if (tag_artist) artist.textContent = t(tag_artist, 55);

            banner.style.display = 'flex';

            let art_data_url = '';

            if (picture) {
                const base64 = calculate(picture.data);
                art_data_url = `data:${picture.format};base64,${base64}`;
                art.removeAttribute('hidden');
                art.src = art_data_url;
            } else {
                art.src = '';
                art.hidden = true;
            }

            metadata.title = tag_title || default_title;
            metadata.artist = tag_artist || 'Unknown artist';
            metadata.album = album || 'Unknown album';
            metadata.art_url = art_data_url;
            set_media_session_metadata();

            start_art_animation();
            hide_cursor();
        },

        onError: err => {
            console.error('Tag error:', err);
            banner.style.display = 'flex';
            art.src = '';
            art.hidden = true;
            hide_cursor();
        }
    });
});

function toggle_fullscreen() {
    if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
        return;
    }
    document.documentElement.requestFullscreen().catch(() => {});
}

stage.addEventListener('click', () => {
    if (!audio.src) return;
    audio.paused ? audio.play() : audio.pause();
});

stage.addEventListener('dblclick', e => {
    if (banner.contains(e.target)) return;
    if (e.target === uploader || uploader.contains(e.target)) return;
    e.preventDefault();
    toggle_fullscreen();
});

function reset() {
    if (kb.raf) { cancelAnimationFrame(kb.raf); kb.raf = null; }
    kb.last_time = null;
    kb.pan_x = 0;
    kb.pan_y = 0;
    kb.scale = SCALE_MIN;

    audio.pause();
    audio.currentTime = 0;
    audio.src = '';

    uploader.style.display = 'block';
    links.style.display = 'block';
    banner.style.display = 'none';

    art.src = '';
    art.hidden = true;
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
    e.stopPropagation();
    const input = prompt(`Set animation intensity (${MIN_EFFECT_INTENSITY} - ${MAX_EFFECT_INTENSITY})`, String(effect_intensity));
    if (input === null) return;

    const value = parseFloat(input);
    if (Number.isNaN(value)) {
        alert('Invalid number');
        return;
    }

    effect_intensity = clamp(value, MIN_EFFECT_INTENSITY, MAX_EFFECT_INTENSITY);
    pan_loop();
});