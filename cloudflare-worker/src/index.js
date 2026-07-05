/**
 * Symvolia IPFS reverse proxy (Cloudflare Worker).
 *
 * Serves the static frontend that is pinned to IPFS at a fixed CID through a
 * clean custom domain (e.g. https://test.symvolia.org) with NO redirect and no
 * `/ipfs/<cid>` in the address bar.
 *
 * How it works:
 *   - Each request is proxied (server-side `fetch`, HTTP 200) to the Pinata
 *     gateway at `https://<IPFS_GATEWAY>/ipfs/<IPFS_CID><path>`.
 *   - Because it is a proxy and not a 301/302, the browser URL stays on the
 *     custom domain.
 *   - Unknown paths (client-side routes like /forum/usa) fall back to
 *     index.html so the SPA router can handle them.
 *   - Responses are cached at the edge, keyed by the origin URL (which includes
 *     the CID), so a new deploy (new CID) naturally busts the cache.
 *
 * Configuration (Worker vars, see wrangler.jsonc):
 *   IPFS_GATEWAY  Pinata gateway CUSTOM DOMAIN, e.g. "ipfs.symvolia.org".
 *                 Pinata will not serve HTML over the shared *.mypinata.cloud
 *                 host (ERR_ID:00023), so a gateway custom domain is required.
 *                 It must differ from this Worker's own public domain, or
 *                 requests would loop.
 *   IPFS_CID      CID of the current frontend build to serve at the root.
 */

const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";
const HTML_CACHE_CONTROL = "public, max-age=0, must-revalidate";
const STATIC_CACHE_CONTROL = "public, max-age=3600";

export default {
  /**
   * @param {Request} request
   * @param {{ IPFS_GATEWAY?: string; IPFS_CID?: string }} env
   * @param {{ waitUntil: (p: Promise<unknown>) => void }} ctx
   */
  async fetch(request, env, ctx) {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: "GET, HEAD" },
      });
    }

    const gateway = env.IPFS_GATEWAY;
    const cid = env.IPFS_CID;
    if (!gateway || !cid) {
      return new Response(
        "Worker misconfigured: IPFS_GATEWAY and IPFS_CID must be set.",
        { status: 500 },
      );
    }

    const url = new URL(request.url);
    const base = `https://${gateway}/ipfs/${cid}`;

    const originResponse = await fetchFromGateway(
      base,
      url.pathname,
      url.search,
      ctx,
    );

    // SPA fallback: unknown path with no file → serve index.html at HTTP 200 so
    // the client-side router can render the route.
    if (
      originResponse.status === 404 &&
      isNavigationRequest(request, url.pathname)
    ) {
      const indexResponse = await fetchFromGateway(base, "/index.html", "", ctx);
      return withResponseHeaders(indexResponse, "/index.html");
    }

    return withResponseHeaders(originResponse, url.pathname);
  },
};

/**
 * Fetch a path from the IPFS gateway, using the edge cache keyed by the
 * CID-scoped origin URL.
 *
 * @param {string} base       `https://<gateway>/ipfs/<cid>`
 * @param {string} pathname
 * @param {string} search
 * @param {{ waitUntil: (p: Promise<unknown>) => void }} ctx
 * @returns {Promise<Response>}
 */
async function fetchFromGateway(base, pathname, search, ctx) {
  const originUrl = `${base}${pathname}${search}`;
  const cache = caches.default;
  const cacheKey = new Request(originUrl, { method: "GET" });

  const cached = await cache.match(cacheKey);
  if (cached) {
    return cached;
  }

  const response = await fetch(originUrl, { redirect: "follow" });

  // Only cache successful responses; the cache key contains the CID, so cached
  // entries are implicitly invalidated when a new build (new CID) is deployed.
  if (response.ok) {
    const cacheable = new Response(response.body, response);
    cacheable.headers.set("Cache-Control", STATIC_CACHE_CONTROL);
    ctx.waitUntil(cache.put(cacheKey, cacheable.clone()));
    return cacheable;
  }

  return response;
}

/**
 * Rewrite the browser-facing Cache-Control header based on the request path.
 *
 * @param {Response} response
 * @param {string} pathname
 * @returns {Response}
 */
function withResponseHeaders(response, pathname) {
  const headers = new Headers(response.headers);

  if (pathname.startsWith("/assets/")) {
    // Vite emits content-hashed files under /assets/ — safe to cache forever.
    headers.set("Cache-Control", IMMUTABLE_CACHE_CONTROL);
  } else if (isHtmlPath(pathname)) {
    headers.set("Cache-Control", HTML_CACHE_CONTROL);
  } else {
    headers.set("Cache-Control", STATIC_CACHE_CONTROL);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * @param {Request} request
 * @param {string} pathname
 * @returns {boolean}
 */
function isNavigationRequest(request, pathname) {
  const accept = request.headers.get("Accept") ?? "";
  if (accept.includes("text/html")) {
    return true;
  }
  return !hasFileExtension(pathname);
}

/**
 * @param {string} pathname
 * @returns {boolean}
 */
function isHtmlPath(pathname) {
  return pathname === "/" || pathname.endsWith(".html") || !hasFileExtension(pathname);
}

/**
 * @param {string} pathname
 * @returns {boolean}
 */
function hasFileExtension(pathname) {
  const lastSegment = pathname.split("/").pop() ?? "";
  return lastSegment.includes(".");
}
