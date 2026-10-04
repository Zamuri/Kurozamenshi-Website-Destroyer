(() => {
  'use strict';

  const DB_NAME = 'kurozamenshi-destroyer';
  const DB_VERSION = 1;
  const STORE = 'pages';
  const LOCAL_HOST = 'local.kurozamenshi';
  const OFFICIAL_API = 'https://destroy.spritefusion.com/api/page';
  const PUBLIC_PROXY = 'https://api.allorigins.win/raw?url=';

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function dbPut(record) {
    try {
      const db = await openDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(record);
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    } catch (e) {
      console.warn('[Kurozamenshi] save failed:', e);
    }
  }

  async function dbGet(id) {
    try {
      const db = await openDB();
      const result = await new Promise((resolve, reject) => {
        const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
      db.close();
      return result;
    } catch {
      return null;
    }
  }

  async function dbAll() {
    try {
      const db = await openDB();
      const result = await new Promise((resolve, reject) => {
        const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
      db.close();
      return result;
    } catch {
      return [];
    }
  }

  const nativeFetch = window.fetch.bind(window);

  function htmlResponse(html, finalUrl) {
    return new Response(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'x-final-url': finalUrl || ''
      }
    });
  }

  function normalizeUrl(value) {
    if (value === 'demo') return value;
    if (/^https?:\/\//i.test(value)) return value;
    return `https://${value}`;
  }

  function makeDemoHtml() {
    const cards = Array.from({ length: 16 }, (_, i) => `<div class="card">Block ${i + 1}</div>`).join('');
    return `<!doctype html><html><head><meta charset="utf-8"><title>Kurozamenshi Demo</title>
      <style>
        *{box-sizing:border-box}html,body{margin:0;background:#101010;color:#eee;font-family:Arial,sans-serif}
        body{padding:40px}h1{font-size:64px;margin:0 0 16px}p{font-size:22px;max-width:900px}
        .hero{height:170px;background:#ff2b45;margin:30px 0;padding:26px;font-size:34px;font-weight:800}
        .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:15px}.card{height:105px;background:#3d3d3d;padding:15px;font-size:20px}
      </style></head><body><h1>Kurozamenshi Demo</h1><p>Offline demo page. Destroy it without an Internet connection.</p>
      <div class="hero">DESTROY THIS WEBSITE</div><div class="grid">${cards}</div></body></html>`;
  }

  async function fetchOnlinePage(target) {
    const url = normalizeUrl(target);

    // Best result: use the original game's page conversion API when it permits CORS.
    try {
      const official = `${OFFICIAL_API}?url=${encodeURIComponent(url)}`;
      const response = await nativeFetch(official, { cache: 'no-store', mode: 'cors' });
      if (response.ok) {
        const html = await response.text();
        return {
          html,
          finalUrl: response.headers.get('x-final-url') || url,
          source: 'official-api'
        };
      }
    } catch (e) {
      console.warn('[Kurozamenshi] official page API unavailable:', e);
    }

    // Fallback for public HTML: raw AllOrigins proxy. This is a fallback for
    // static/public pages; JS-heavy or protected pages may not work.
    const proxyUrl = `${PUBLIC_PROXY}${encodeURIComponent(url)}`;
    const proxied = await nativeFetch(proxyUrl, { cache: 'no-store', mode: 'cors' });
    if (!proxied.ok) throw new Error(`Could not fetch ${url} (HTTP ${proxied.status})`);
    return {
      html: await proxied.text(),
      finalUrl: url,
      source: 'public-proxy'
    };
  }

  window.fetch = async function(input, init) {
    const raw = typeof input === 'string' ? input : input?.url || '';
    let absolute;
    try {
      absolute = new URL(raw, location.href);
    } catch {
      return nativeFetch(input, init);
    }

    const isPageApi = absolute.pathname === '/api/page' || absolute.pathname.endsWith('/api/page');
    if (!isPageApi || (init && init.method && String(init.method).toUpperCase() !== 'GET')) {
      return nativeFetch(input, init);
    }

    const requested = absolute.searchParams.get('url') || '';

    if (requested === 'demo') {
      const demo = {
        id: 'demo',
        html: makeDemoHtml(),
        finalUrl: `${location.origin}/demo`,
        title: 'Kurozamenshi Demo',
        savedAt: Date.now(),
        source: 'demo'
      };
      await dbPut(demo);
      return htmlResponse(demo.html, demo.finalUrl);
    }

    if (/^https:\/\/local\.kurozamenshi\//i.test(requested)) {
      const id = decodeURIComponent(requested.slice('https://local.kurozamenshi/'.length).replace(/^\/+/, ''));
      const saved = await dbGet(id);
      if (!saved) return new Response('Saved HTML not found.', { status: 404 });
      return htmlResponse(saved.html, saved.finalUrl || requested);
    }

    const target = normalizeUrl(requested);

    try {
      const result = await fetchOnlinePage(target);
      await dbPut({
        id: target,
        html: result.html,
        finalUrl: result.finalUrl,
        title: target,
        savedAt: Date.now(),
        source: result.source
      });
      return htmlResponse(result.html, result.finalUrl);
    } catch (err) {
      const cached = await dbGet(target);
      if (cached) return htmlResponse(cached.html, cached.finalUrl || target);
      throw err;
    }
  };

  async function addHtmlFile(file) {
    const html = await file.text();
    const id = `html-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const title = file.name.replace(/\.html?$/i, '') || 'Local HTML';
    await dbPut({
      id,
      html,
      finalUrl: `https://${LOCAL_HOST}/${id}`,
      title,
      fileName: file.name,
      savedAt: Date.now(),
      source: 'html'
    });
    return `https://${LOCAL_HOST}/${id}`;
  }

  function installHtmlUI() {
    const form = document.getElementById('urlform');
    const input = document.getElementById('url');
    if (!form || !input || document.getElementById('kuro-add-html')) return;

    const picks = form.parentElement?.querySelector('.picks');
    const holder = document.createElement('div');
    holder.className = 'picks col';
    holder.innerHTML = `
      <p>Kurozamenshi</p>
      <div class="pick-row">
        <button class="btn" type="button" id="kuro-add-html"><span><p>+ Add HTML</p></span></button>
        <button class="tag" type="button" id="kuro-saved-html"><span>Saved HTML</span></button>
      </div>
      <input id="kuro-html-file" type="file" accept=".html,.htm,text/html" hidden />
      <p class="muted" id="kuro-offline-note">Online pages are saved locally after loading. Saved HTML works offline.</p>
    `;
    picks?.parentNode?.insertBefore(holder, picks) || form.parentNode?.appendChild(holder);

    const fileInput = document.getElementById('kuro-html-file');
    document.getElementById('kuro-add-html').addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        input.value = await addHtmlFile(file);
        form.requestSubmit();
      } catch {
        const err = document.getElementById('err');
        if (err) err.textContent = `Could not read ${file.name}`;
      } finally {
        fileInput.value = '';
      }
    });

    document.getElementById('kuro-saved-html').addEventListener('click', async () => {
      const saved = (await dbAll()).filter(x => x.source === 'html' || x.id === 'demo');
      if (!saved.length) {
        const err = document.getElementById('err');
        if (err) err.textContent = 'No saved HTML yet.';
        return;
      }
      const label = prompt(
        'Saved HTML:\n\n' +
        saved.map((x, i) => `${i + 1}. ${x.title || x.fileName || x.id}`).join('\n') +
        '\n\nEnter number:'
      );
      const n = Number(label);
      if (!Number.isInteger(n) || n < 1 || n > saved.length) return;
      input.value = saved[n - 1].finalUrl;
      form.requestSubmit();
    });
  }

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(err => {
      console.warn('[Kurozamenshi] Service Worker registration failed:', err);
    });
  }

  function init() {
    registerSW();
    installHtmlUI();
    window.addEventListener('DOMContentLoaded', installHtmlUI, { once: true });
  }

  init();
})();
