function set_media_session_metadata() {
    if (!('mediaSession' in navigator)) return;

    const artwork = [];
    if (metadata.artUrl) {
        const type = metadata.artUrl.startsWith('data:')
            ? metadata.artUrl.slice(5, metadata.artUrl.indexOf(';'))
            : 'image/jpeg';
        artwork.push({ src: metadata.artUrl, sizes: '512x512', type });
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
