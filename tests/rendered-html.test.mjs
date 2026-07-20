import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the DragonMode loading shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>DragonMode — Protect your hoard<\/title>/i);
  assert.match(html, /class="app-stage"/);
  assert.match(html, /class="mobile-shell boot-screen"/);
  assert.match(html, /Waking the vault…/);
  assert.match(html, /lucide-gem/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
});

test("keeps the loading shell branded, responsive, and disposable", async () => {
  const [page, css, layout] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(page, /className="mobile-shell boot-screen"/);
  assert.match(page, /Waking the vault…/);
  assert.match(page, /if \(!ready\)/);
  assert.match(css, /\.boot-screen/);
  assert.match(css, /radial-gradient/);
  assert.match(css, /@media \(max-height: 600px\)/);
  assert.match(layout, /title: "DragonMode — Protect your hoard"/);
  assert.match(layout, /applicationName: "DragonMode"/);
  assert.match(layout, /app-icon-v2\.png/);
  assert.doesNotMatch(page, /SkeletonPreview|_sites-preview/);
});
