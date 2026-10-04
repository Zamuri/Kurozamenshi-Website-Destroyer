const CACHE = 'kurozamenshi-destroyer-v1';
const ASSETS = [
  "./_app/apple-touch-icon-b67mbd2s.png",
  "./_app/badge-light-cza4m21j.svg",
  "./_app/badge-s8jyv0vp.svg",
  "./_app/boltIcon-v9dmn2sh.svg",
  "./_app/closeIcon-cwde2hjm.svg",
  "./_app/crown-cads1r3f.js",
  "./_app/discordIcon-j08ja80d.svg",
  "./_app/escIcon-ep4tszws.svg",
  "./_app/favicon-16x16-4phv4t4f.png",
  "./_app/favicon-32x32-ehn2ggpe.png",
  "./_app/favicon-jqv269pb.ico",
  "./_app/favicon-n9zy1r36.png",
  "./_app/index-3j3x5w5n.js",
  "./_app/index-eew963c9.js",
  "./_app/monitorIcon-tkqvd2hx.svg",
  "./_app/mouseLeftIcon-47ae7rmd.svg",
  "./_app/mouseRightIcon-spccm0mv.svg",
  "./_app/og-rz7phhgb.png",
  "./_app/pumpkin-yeq46t0d.js",
  "./_app/skeleton-xh7a8per.js",
  "./_app/spaceBarIcon-3zzb4qy0.svg",
  "./_app/vampire-9dgx7t2s.js",
  "./_app/will-290rd0jb.js",
  "./assets/cc0/mountain-dusk/parallax-mountain-bg.png",
  "./assets/cc0/mountain-dusk/parallax-mountain-foreground-trees.png",
  "./assets/cc0/mountain-dusk/parallax-mountain-montain-far.png",
  "./assets/cc0/mountain-dusk/parallax-mountain-mountains.png",
  "./assets/cc0/mountain-dusk/parallax-mountain-trees.png",
  "./assets/cc0/sunny-land/back.png",
  "./assets/cc0/synth-back.png",
  "./assets/cc0/synth-buildings.png",
  "./assets/cc0/synth-front.png",
  "./assets/featured/spritefusion.png",
  "./assets/fonts/chevyray-oeuf.ttf",
  "./assets/fonts/chevyray.ttf",
  "./assets/maps/arcade/level-821b746182.json.gz",
  "./assets/maps/arcade/preview.jpg",
  "./assets/maps/atomicacres/level-f88afac983.json.gz",
  "./assets/maps/atomicacres/preview.jpg",
  "./assets/maps/candy/level-f544213b9c.json.gz",
  "./assets/maps/candy/preview.jpg",
  "./assets/maps/desktop/level-f5adfe0fb2.json.gz",
  "./assets/maps/desktop/preview.jpg",
  "./assets/maps/dino/level-9d40df3afc.json.gz",
  "./assets/maps/dino/preview.jpg",
  "./assets/maps/dockyard/level-3f459ed0a3.json.gz",
  "./assets/maps/dockyard/preview.jpg",
  "./assets/maps/fonts/anton.woff2",
  "./assets/maps/fonts/archivo-black.woff2",
  "./assets/maps/fonts/arimo-italic.woff2",
  "./assets/maps/fonts/arimo.woff2",
  "./assets/maps/fonts/cousine-bold.woff2",
  "./assets/maps/fonts/cousine.woff2",
  "./assets/maps/fonts/gelasio.woff2",
  "./assets/maps/frostline/level-6aaf428ad5.json.gz",
  "./assets/maps/frostline/preview.jpg",
  "./assets/maps/highrise/level-9729b9cddc.json.gz",
  "./assets/maps/highrise/preview.jpg",
  "./assets/maps/icelock/level-4b6691da6c.json.gz",
  "./assets/maps/icelock/preview.jpg",
  "./assets/maps/moonbase/level-6ac9012141.json.gz",
  "./assets/maps/moonbase/preview.jpg",
  "./assets/maps/pirates/level-67242a4a3f.json.gz",
  "./assets/maps/pirates/preview.jpg",
  "./assets/maps/rooftops/level-893e1c433d.json.gz",
  "./assets/maps/rooftops/preview.jpg",
  "./assets/maps/toybox/level-b10eb12190.json.gz",
  "./assets/maps/toybox/preview.jpg",
  "./assets/sfx/chip.flac",
  "./assets/sfx/chip.json",
  "./assets/site/apple-touch-icon.png",
  "./assets/site/favicon.png",
  "./assets/site/manifest.json",
  "./assets/sprites/anchors.json",
  "./assets/sprites/bomblet.png",
  "./assets/sprites/drone.png",
  "./assets/sprites/flamethrower.png",
  "./assets/sprites/gatling.png",
  "./assets/sprites/grenade.png",
  "./assets/sprites/jetpack.png",
  "./assets/sprites/launcher.png",
  "./assets/sprites/mirv.png",
  "./assets/sprites/neutron.png",
  "./assets/sprites/overkill.png",
  "./assets/sprites/parachute.png",
  "./assets/sprites/pistol.png",
  "./assets/sprites/railgun.png",
  "./assets/sprites/remote.png",
  "./assets/sprites/rocket.png",
  "./assets/sprites/shotgun.png",
  "./assets/sprites/smg.png",
  "./assets/sprites/wand.png",
  "./assets/video/title.jpg",
  "./assets/video/title.mp4",
  "./badge.svg",
  "./index.html",
  "./og.png"
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/api/')) return;

  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(response => {
        if (response.ok && req.url.startsWith(self.location.origin)) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy)).catch(() => {});
        }
        return response;
      });
    })
  );
});
