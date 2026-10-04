window.KURO_CONFIG = {
  // Put your own Cloudflare Worker here later, e.g. https://daw-proxy.example.workers.dev
  // Leave empty to use the public CORS fallback.
  pageEndpoint: "",
  resourceEndpoint: "",
  scriptEndpoint: "",
  fallbackPageEndpoint: "https://api.allorigins.win/raw?url=",
  fallbackResourceEndpoint: "https://api.allorigins.win/raw?url=",
  cacheRemote: true
};
