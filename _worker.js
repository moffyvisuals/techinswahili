// Cloudflare Pages worker: gives shared links /a/<id> (article) and /d/<id> (discussion)
// a proper preview card (title, text, cover image) for WhatsApp, X, Facebook and Telegram.
// Everything else is served normally. If anything fails, the normal site is served.
const ESC = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const strip = t => String(t || "").replace(/```[\s\S]*?```/g, " ").replace(/!\[[^\]]*\]\([^)]*\)/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[#>*`_]/g, "").replace(/\s+/g, " ").trim();

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const im = url.pathname.match(/^\/i\/([ad])\/([0-9a-fA-F-]{8,40})$/);
      const m = im || url.pathname.match(/^\/([ad])\/([0-9a-fA-F-]{8,40})\/?$/);
      if (!m) return env.ASSETS.fetch(request);
      const kind = m[1], id = m[2];
      const cfg = await (await env.ASSETS.fetch(new URL("/config.js", url))).text();
      const base = (cfg.match(/url:\s*"([^"]+)"/) || [])[1], key = (cfg.match(/key:\s*"([^"]+)"/) || [])[1];
      if (!base || !key) return env.ASSETS.fetch(request);
      const table = kind === "a" ? "articles" : "discussions";
      const filter = kind === "a" ? "&status=eq.published" : "";
      const r = await fetch(`${base}/rest/v1/${table}?select=title,body,img&id=eq.${id}${filter}`, { headers: { apikey: key, Authorization: "Bearer " + key } });
      const row = r.ok ? (await r.json())[0] : null;
      if (url.searchParams.get("debug")) return new Response(JSON.stringify({ worker: "running", supabaseStatus: r.status, found: !!row, hasTitle: !!(row && row.title), imageKind: !row || !row.img ? "none (logo used)" : /^data:/.test(row.img) ? "embedded (served via /i/)" : "link" }, null, 1), { headers: { "content-type": "application/json" } });
      if (im) {
        const d = row && row.img && row.img.match(/^data:(image\/[a-z+.-]+);base64,(.+)$/s);
        if (!d) return Response.redirect(url.origin + "/icon-512.png", 302);
        const bin = Uint8Array.from(atob(d[2]), c => c.charCodeAt(0));
        return new Response(bin, { headers: { "content-type": d[1], "cache-control": "public, max-age=86400" } });
      }
      const hash = `/#/${kind === "a" ? "article" : "disc"}/${id}`;
      if (!row) return Response.redirect(url.origin + hash, 302);
      const title = ESC(row.title), desc = ESC(strip(row.body).slice(0, 180)), pic = !row.img ? url.origin + "/icon-512.png" : /^data:/.test(row.img) ? `${url.origin}/i/${kind}/${id}` : /^\/\//.test(row.img) ? "https:" + row.img : /^\//.test(row.img) ? url.origin + row.img : row.img, img = ESC(pic);
      const html = `<!doctype html><html lang="sw"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | Tech In Swahili</title>
<meta name="description" content="${desc}"><meta property="og:type" content="article"><meta property="og:site_name" content="Tech In Swahili"><meta property="og:title" content="${title}"><meta property="og:description" content="${desc}"><meta property="og:image" content="${img}"><meta property="og:image:secure_url" content="${img}"><link rel="image_src" href="${img}"><meta property="og:url" content="${ESC(url.href)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${desc}"><meta name="twitter:image" content="${img}">
<meta http-equiv="refresh" content="0;url=${hash}"></head><body style="background:#000;color:#fff;font-family:sans-serif"><script>location.replace(${JSON.stringify(hash)})</script><p><a href="${hash}" style="color:#6fbf4a">Open on Tech In Swahili</a></p></body></html>`;
      return new Response(html, { headers: { "content-type": "text/html;charset=utf-8", "cache-control": "public, max-age=300" } });
    } catch (e) {
      return env.ASSETS.fetch(request);
    }
  }
};
