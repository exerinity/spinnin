function set_media_session_metadata() {
    if (!('mediaSession' in navigator)) return;

    const artwork = [];
    if (metadata.art_url) {
        const type = metadata.art_url.startsWith('data:')
            ? metadata.art_url.slice(5, metadata.art_url.indexOf(';'))
            : 'image/jpeg';
        artwork.push({ src: metadata.art_url, sizes: '512x512', type });
    }

    try {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: metadata.title || 'Unknown track',
            artist: metadata.artist || 'Unknown artist',
            album: metadata.album || 'Unknown album',
            artwork
        });
    } catch {}
}

if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', () => audio.play().catch(() => {}));
    navigator.mediaSession.setActionHandler('pause', () => audio.pause());
}
