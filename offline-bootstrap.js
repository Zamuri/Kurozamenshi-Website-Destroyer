(() => {
  'use strict';

  const DB_NAME = 'kurozamenshi-destroyer';
  const DB_VERSION = 1;
  const STORE = 'pages';
  const LOCAL_HOST = 'local.kurozamenshi';

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
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
      console.warn('[Kurozamenshi] Could not save page:', e);
    }
  }

  async function dbGet(id) {
    try {
      const db = await openDB();
      const value = await new Promise((resolve, reject) => {
        const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
      db.close();
      return value;
    } catch {
      return null;
    }
  }

  async function dbAll() {
    try {
      const db = await openDB();
      const values = await new Promise((resolve, reject) => {
        const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
      db.close();
      return values;
    } catch {
      return [];
    }
  }

  const nativeFetch = window.fetch.bind(window);

  async function pageResponse(record) {
    return new Response(record.html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'x-final-url': record.finalUrl || record.id || 'https://local.kurozamenshi/'
      }
    });
  }

  function makeDemoHtml() {
    return `<!doctype html><html><head><meta charset="utf-8"><title>Kurozamenshi Demo</title>
    <style>html,body{margin:0;background:#111;color:#eee;font-family:Arial,sans-serif}body{padding:40px}h1{font-size:64px;margin:0 0 20px}p{font-size:24px;max-width:900px}.box{height:130px;background:#ff2b45;margin:30px 0;padding:20px;box-sizing:border-box}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:15px}.card{height:100px;background:#444;padding:15px;box-sizing:border-box}</style></head>
    <body><h1>Kurozamenshi Demo</h1><p>This is the built-in offline demo page.</p><div class="box">DESTROY THIS WEBSITE</div><div class="grid">${Array.from({length:12},(_,i)=>`<div class="card">Block ${i+1}</div>`).join('')}</div></body></html>`;
  }

  window.fetch = async function(input, init) {
    const raw = typeof input === 'string' ? input : input?.url || '';
    let absolute;
    try { absolute = new URL(raw, location.href); } catch { return nativeFetch(input, init); }

    const isPageApi = absolute.pathname.endsWith('/api/page') || absolute.pathname === '/api/page';
    if (!isPageApi) return nativeFetch(input, init);

    const requested = absolute.searchParams.get('url') || '';

    if (requested === 'demo') {
      const demo = { id: 'demo', html: makeDemoHtml(), finalUrl: 'https://local.kurozamenshi/demo' };
      await dbPut({ ...demo, title: 'Offline Demo', savedAt: Date.now() });
      return pageResponse(demo);
    }

    if (/^https:\/\/local\.kurozamenshi\//i.test(requested)) {
      const id = requested.slice('https://local.kurozamenshi/'.length).replace(/^\/+/, '');
      const saved = await dbGet(decodeURIComponent(id));
      if (saved) return pageResponse(saved);
      return new Response('Saved HTML not found.', { status: 404 });
    }

    try {
      const response = await nativeFetch(input, init);
      if (response.ok) {
        const html = await response.clone().text();
        const finalUrl = response.headers.get('x-final-url') || requested;
        await dbPut({
          id: requested,
          html,
          finalUrl,
          title: requested,
          savedAt: Date.now(),
          source: 'online'
        });
      }
      return response;
    } catch (err) {
      const cached = await dbGet(requested);
      if (cached) return pageResponse(cached);
      throw err;
    }
  };

  async function addHtmlFile(file) {
    const html = await file.text();
    const id = `html-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
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
      <p class="muted" id="kuro-offline-note">Online pages are cached after a successful load. Saved HTML works offline.</p>
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
      } catch (e) {
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
        if (err) err.textContent = 'No saved HTML yet. Use + Add HTML first.';
        return;
      }
      const label = prompt('Saved HTML:\n\n' + saved.map((x,i)=>`${i+1}. ${x.title || x.fileName || x.id}`).join('\n') + '\n\nEnter number:');
      const n = Number(label);
      if (!Number.isInteger(n) || n < 1 || n > saved.length) return;
      input.value = saved[n-1].finalUrl;
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
