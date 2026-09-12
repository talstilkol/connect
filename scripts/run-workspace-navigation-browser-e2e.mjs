import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

// Exercise the built application with its existing configuration-required state.
// This runner neither loads environment files nor creates users or business data.
for (const key of ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"]) {
  assert.ok(!process.env[key]?.trim(), "Run navigation acceptance without Clerk credentials");
}
const assetsRoot = path.resolve(fileURLToPath(new URL("../dist/client/", import.meta.url)));
const { default: worker } = await import("../dist/server/index.js");
const contentTypes = {
  ".css": "text/css", ".js": "text/javascript", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2",
};

async function readAsset(request) {
  const pathname = decodeURIComponent(new URL(request.url).pathname);
  const file = path.resolve(assetsRoot, `.${pathname}`);
  if (!file.startsWith(`${assetsRoot}${path.sep}`)) return new Response(null, { status: 404 });
  try {
    return new Response(await readFile(file), {
      headers: { "content-type": contentTypes[path.extname(file)] ?? "application/octet-stream" },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}

const server = createServer(async (incoming, outgoing) => {
  try {
    if (incoming.method !== "GET") {
      outgoing.writeHead(405).end();
      return;
    }
    const request = new Request(new URL(incoming.url, "http://localhost"), {
      headers: incoming.headers,
    });
    let response = await readAsset(request);
    if (response.status === 404) {
      response = await worker.fetch(request, { ASSETS: { fetch: readAsset } }, {
        waitUntil() {}, passThroughOnException() {},
      });
    }
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    if (response.body) Readable.fromWeb(response.body).pipe(outgoing);
    else outgoing.end();
  } catch {
    outgoing.writeHead(500).end("Navigation acceptance server failed");
  }
});

let browser;
let page;
const errors = [];
try {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  const origin = `http://127.0.0.1:${port}`;
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", (route) => new URL(route.request().url()).origin === origin
    ? route.continue() : route.abort());

  for (const language of ["he", "en", "ar"]) {
    await page.setViewportSize({ width: 390, height: 844 });
    const response = await page.goto(`${origin}/workspace?lang=${language}`);
    assert.equal(response.status(), 200);
    const sidebar = page.locator(".sidebar");
    const toggle = page.locator(".mobile-menu-button");
    const links = sidebar.locator("button:not(:disabled), a[href], select:not(:disabled)");
    await toggle.waitFor();
    assert.equal(await sidebar.isVisible(), false, `${language}: closed menu must be hidden`);

    await page.locator(".skip-link").focus();
    await page.keyboard.press("Tab");
    assert.equal(await toggle.evaluate((element) => element === document.activeElement), true,
      `${language}: Tab must skip the closed sidebar`);

    await toggle.click();
    await page.waitForFunction(() => document.querySelector(".sidebar")?.contains(document.activeElement), null, { timeout: 5000 });
    assert.equal(await toggle.getAttribute("aria-expanded"), "true");
    assert.equal(await sidebar.getAttribute("role"), "dialog");
    assert.equal(await links.first().evaluate((element) => element === document.activeElement), true);
    assert.equal(await page.locator("#workspace-content").evaluate((element) => element.inert), true);

    await page.keyboard.press("Shift+Tab");
    assert.equal(await links.last().evaluate((element) => element === document.activeElement), true);
    await page.keyboard.press("Tab");
    assert.equal(await links.first().evaluate((element) => element === document.activeElement), true);
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => document.querySelector(".mobile-menu-button")?.getAttribute("aria-expanded") === "false");
    assert.equal(await sidebar.isVisible(), false);
    assert.equal(await toggle.evaluate((element) => element === document.activeElement), true);
    assert.equal(await page.locator("#workspace-content").evaluate((element) => element.inert), false);

    await toggle.click();
    await page.locator(".mobile-overlay").click({ position: { x: language === "en" ? 370 : 20, y: 400 } });
    assert.equal(await toggle.evaluate((element) => element === document.activeElement), true);

    await toggle.click();
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForFunction(() => !document.querySelector("#workspace-content")?.inert);
    assert.equal(await sidebar.isVisible(), true, `${language}: desktop navigation remains visible`);
    assert.equal(await page.locator(".mobile-overlay").count(), 0);
    assert.equal(await sidebar.getAttribute("aria-modal"), null);
  }
  assert.deepEqual(errors, []);
  console.log("Workspace navigation browser acceptance passed: Hebrew, English, Arabic; hidden focus, dialog focus cycle, Escape, backdrop and desktop resize.");
} catch (error) {
  console.error("Navigation browser diagnostic:", JSON.stringify({
    errors,
    state: await page?.evaluate(() => ({
      sidebar: document.querySelector(".sidebar")?.className,
      expanded: document.querySelector(".mobile-menu-button")?.getAttribute("aria-expanded"),
      focusedTag: document.activeElement?.tagName,
      focusedClass: document.activeElement?.className,
      sidebarVisibility: document.querySelector(".sidebar") && getComputedStyle(document.querySelector(".sidebar")).visibility,
      sidebarInertAncestor: document.querySelector(".sidebar")?.closest("[inert]")?.className,
      viewport: window.innerWidth,
      firstButton: document.querySelector(".sidebar button:not(:disabled)")?.outerHTML.slice(0, 150),
    })).catch(() => null),
  }));
  throw error;
} finally {
  await browser?.close();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
