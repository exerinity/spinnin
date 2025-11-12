function set_media_session_metadata(artUrl) {
    if (!('mediaSession' in navigator)) return;
    try {
        navigator.mediaSession.metadata = new MediaMetadata({
            title: metadata.title || 'Unknown track',
            artist: metadata.artist || 'Unknown artist',
            album: metadata.album || 'Unknown album'
        });
    } catch {}
}

if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', () => {
        audio.play().catch(() => {
            throw_error('Unable to play the audio!');
        });
    });
    navigator.mediaSession.setActionHandler('pause', () => {
        audio.pause();
    });
}