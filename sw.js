self.addEventListener("install", e => {
    e.waitUntil(
        caches.open("whatsdeliver-v1").then(cache => {
            return cache.addAll([
                "/",
                "/?m=1", // versi mobile 
                "https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css",
                "https://blogger.googleusercontent.com/img/a/AVvXsEj_ufbmv6p9THXc8bw1c_OZCuLvGu0ivWv1ioksKCFAgn5SSkI6Qcyn9oTDJAOidn78wyhhw2cp-tZSq5hpcKiuQ1pfsC2jXg1-HqR--qNiz5CLb8Hj3DPfDFlwboXcBv0W0fCccoc5XUFljA1KPL3xrIEKSAuhPXlYsqH4cHa7_EpCwPRgdw-50UYonZ5a=s512"
            ]);
        })
    );
});

self.addEventListener("fetch", e => {
    e.respondWith(
        caches.match(e.request).then(response => {
            return response || fetch(e.request);
        })
    );
});

