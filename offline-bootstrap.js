(() => {
  const DB_NAME = 'kuro-destroyer';
  const DB_VERSION = 1;
  const STORE = 'html';
  const FALLBACK_PAGE = 'https://api.allorigins.win/raw?url=';
  const FALLBACK_RESOURCE = 'https://api.allorigins.win/raw?url=';

  function cfg() {
    return window.KURO_CONFIG || {};
  }

  function endpoint(primary, fallback) {
    return primary || fallback;
  }

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
      req.onerror = () => reject(req.error || new Error('IndexedDB unavailable'));
    });
  }

  async function putHTML(id, name, html) {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ id, name, html, savedAt: Date.now() });
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || new Error('Could not save HTML'));
    });
    db.close();
  }

  async function getHTML(id) {
    const db = await openDB();
    const value = await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error || new Error('Could not read HTML'));
    });
    db.close();
    if (!value) throw new Error('Saved HTML was not found.');
    return value;
  }

  function proxied(url, resource = false) {
    const c = cfg();
    const p = endpoint(resource ? c.resourceEndpoint : c.pageEndpoint,
      resource ? (c.fallbackResourceEndpoint || FALLBACK_RESOURCE)
               : (c.fallbackPageEndpoint || FALLBACK_PAGE));
    return p + encodeURIComponent(url);
  }

  function absolute(raw, base) {
    try { return new URL(raw, base).href; } catch { return null; }
  }

  function shouldProxy(raw) {
    if (!raw) return false;
    const x = raw.trim();
    return !x.startsWith('#') &&
      !x.startsWith('data:') &&
      !x.startsWith('blob:') &&
      !x.startsWith('javascript:') &&
      !x.startsWith('mailto:') &&
      !x.startsWith('tel:');
  }

  function rewriteCSS(css, base) {
    return css.replace(/url\((\s*["']?)([^"')]+)(["']?\s*)\)/gi, (m, a, raw, b) => {
      if (!shouldProxy(raw)) return m;
      const u = absolute(raw, base);
      return u ? `url(${a}${proxied(u, true)}${b})` : m;
    });
  }

  function rewriteHTML(html, finalUrl) {
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const attrs = [
        ['img','src'], ['source','src'], ['video','src'], ['video','poster'],
        ['audio','src'], ['script','src'], ['link','href'], ['iframe','src']
      ];
      for (const [tag, attr] of attrs) {
        for (const el of doc.querySelectorAll(`${tag}[${attr}]`)) {
          const raw = el.getAttribute(attr);
          if (!shouldProxy(raw)) continue;
          const u = absolute(raw, finalUrl);
          if (u) el.setAttribute(attr, proxied(u, true));
        }
      }
      for (const el of doc.querySelectorAll('[srcset]')) {
        const raw = el.getAttribute('srcset') || '';
        const rewritten = raw.split(',').map(part => {
          const bits = part.trim().split(/\s+/);
          if (!bits[0] || !shouldProxy(bits[0])) return part;
          const u = absolute(bits[0], finalUrl);
          if (!u) return part;
          bits[0] = proxied(u, true);
          return bits.join(' ');
        }).join(', ');
        el.setAttribute('srcset', rewritten);
      }
      for (const el of doc.querySelectorAll('[style]')) {
        el.setAttribute('style', rewriteCSS(el.getAttribute('style') || '', finalUrl));
      }
      for (const style of doc.querySelectorAll('style')) {
        style.textContent = rewriteCSS(style.textContent || '', finalUrl);
      }
      return '<!doctype html>\n' + doc.documentElement.outerHTML;
    } catch {
      return html;
    }
  }

  window.KURO_LOAD_HTML = async id => getHTML(id);
  window.KURO_REWRITE_HTML = rewriteHTML;
  window.KURO_SAVE_REMOTE = async (url, html, finalUrl) => {
    const id = `url-${btoa(unescape(encodeURIComponent(url))).replace(/[^a-zA-Z0-9]/g, '').slice(0, 80)}`;
    await putHTML(id, finalUrl || url, html);
  };

  window.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('urlform');
    const input = document.getElementById('url');
    if (!form || !input) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn';
    button.style.flex = '0 0 auto';
    button.setAttribute('data-kuro-add-html', '1');
    button.innerHTML = '<span><p>+ Add HTML</p></span>';

    const file = document.createElement('input');
    file.type = 'file';
    file.accept = '.html,.htm,text/html';
    file.hidden = true;

    button.addEventListener('click', () => file.click());
    file.addEventListener('change', async () => {
      const selected = file.files && file.files[0];
      if (!selected) return;
      try {
        const html = await selected.text();
        const id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
        await putHTML(id, selected.name, html);
        input.value = `html:${id}`;
        form.requestSubmit();
      } catch (err) {
        alert(err?.message || 'Could not import HTML.');
      } finally {
        file.value = '';
      }
    });

    form.append(button, file);
  });
})();
