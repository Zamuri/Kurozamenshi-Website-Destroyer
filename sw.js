const CACHE = 'kurozamenshi-destroyer-v2';
const BASE = new URL('./', self.registration.scope);

const ASSETS = [
  './index.html',
  './offline-bootstrap.js',
  './manifest.webmanifest',
  './og.png',
  './_app/index-3j3x5w5n.js',
  './_app/index-eew963c9.js',
  './_app/skeleton-xh7a8per.js',
  './_app/pumpkin-yeq46t0d.js',
  './_app/will-290rd0jb.js',
  './_app/vampire-9dgx7t2s.js',
  './_app/crown-cads1r3f.js',
  './_app/apple-touch-icon-b67mbd2s.png',
  './_app/badge-light-cza4m21j.svg',
  './_app/badge-s8jyv0vp.svg',
  './_app/boltIcon-v9dmn2sh.svg',
  './_app/closeIcon-cwde2hjm.svg',
  './_app/discordIcon-j08ja80d.svg',
  './_app/escIcon-ep4tszws.svg',
  './_app/favicon-16x16-4phv4t4f.png',
  './_app/favicon-32x32-ehn2ggpe.png',
  './_app/favicon-jqv269pb.ico',
  './_app/favicon-n9zy1r36.png',
  './_app/monitorIcon-tkqvd2hx.svg',
  './_app/mouseLeftIcon-47ae7rmd.svg',
  './_app/mouseRightIcon-spccm0mv.svg',
  './_app/og-rz7phhgb.png',
  './_app/spaceBarIcon-3zzb4qy0.svg',
  './assets/featured/spritefusion.png',
  './assets/fonts/chevyray.ttf',
  './assets/fonts/chevyray-oeuf.ttf',
  './assets/sfx/chip.json',
  './assets/sfx/chip.flac',
  './assets/site/apple-touch-icon.png',
  './assets/site/favicon.png',
  './assets/site/manifest.json',
  './assets/sprites/anchors.json',
  './assets/sprites/pistol.png',
  './assets/sprites/smg.png',
  './assets/sprites/shotgun.png',
  './assets/sprites/launcher.png',
  './assets/sprites/railgun.png',
  './assets/sprites/flamethrower.png',
  './assets/sprites/overkill.png',
  './assets/sprites/remote.png',
  './assets/sprites/neutron.png',
  './assets/sprites/wand.png',
  './assets/sprites/grenade.png',
  './assets/sprites/rocket.png',
  './assets/sprites/mirv.png',
  './assets/sprites/bomblet.png',
  './assets/sprites/parachute.png',
  './assets/sprites/jetpack.png',
  './assets/sprites/drone.png',
  './assets/sprites/gatling.png',
  './assets/cc0/mountain-dusk/parallax-mountain-bg.png',
  './assets/cc0/mountain-dusk/parallax-mountain-foreground-trees.png',
  './assets/cc0/mountain-dusk/parallax-mountain-montain-far.png',
  './assets/cc0/mountain-dusk/parallax-mountain-mountains.png',
  './assets/cc0/mountain-dusk/parallax-mountain-trees.png',
  './assets/cc0/sunny-land/back.png',
  './assets/cc0/synth-back.png',
  './assets/cc0/synth-buildings.png',
  './assets/cc0/synth-front.png',
  './assets/video/title.jpg',
  './assets/video/title.mp4'
];

const PUBLIC_PROXY = 'https://api.allorigins.win/raw?url=';

function inScope(url) {
  return url.origin === self.location.origin && url.pathname.startsWith(new URL('./', self.registration.scope).pathname);
}

function targetFromProxyPath(pathname) {
  const base = new URL('./', self.registration.scope).pathname;
  if (!pathname.startsWith(base + 'p/http/') && !pathname.startsWith(base + 'p/https/')) return null;
  const rest = pathname.slice(base.length + 2); // remove p/
  const slash = rest.indexOf('/');
  if (slash < 0) return null;
  const scheme = rest.slice(0, slash);
  const target = rest.slice(slash + 1);
  if (scheme !== 'http' && scheme !== 'https' || !target) return null;
  return `${scheme}://${target}`;
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS.map(x => new URL(x, self.registration.scope).href)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const target = targetFromProxyPath(url.pathname);
  if (target) {
    event.respondWith(
      fetch(`${PUBLIC_PROXY}${encodeURIComponent(target)}`, { cache: 'no-store' })
        .then(response => {
          if (!response.ok) throw new Error(`Proxy HTTP ${response.status}`);
          return response;
        })
        .catch(() => caches.match(req).then(cached => cached || Response.error()))
    );
    return;
  }

  if (url.pathname.includes('/api/') || url.pathname.includes('/mp/')) return;
  if (!inScope(url)) return;

  event.respondWith(
    caches.match(req)
      .then(cached => cached || fetch(req).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy)).catch(() => {});
        }
        return response;
      }))
  );
});
