if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js")
        .then(() => {
            console.log("installed sw successfully");
        })
        .catch((err) => {
            console.error("reg failed: ", err);
        });
}