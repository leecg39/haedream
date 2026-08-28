import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const baseUrl = "https://watt.rfenms.com";
const pages = [
  "widgetSet.html",
  "user.html",
  "notify.html",
  "gateNode.html",
  "gateway.html",
  "sequence.html",
  "gateRTU.html",
  "device.html",
  "net.html",
  "bad.html",
];

const researchRoot = path.join(
  root,
  "docs",
  "research",
  "watt.rfenms.com",
  "admin-pages",
);
const publicRoot = path.join(root, "public", "watt");
const fitPublicRoot = path.join(root, "public", "fit");

await mkdir(path.join(researchRoot, "pages"), { recursive: true });
await mkdir(path.join(publicRoot, "pages"), { recursive: true });

async function fetchBuffer(url) {
  const response = await fetch(url, {
    headers: {
      accept: "*/*",
      "accept-language": "ko-KR,ko;q=0.9",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${url}`);
  }
  return {
    body: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") ?? "",
    finalUrl: response.url,
  };
}

function assetUrls(html, pageUrl) {
  const urls = new Set();
  const pattern = /(?:src|href)=["']([^"'#]+)["']/gi;
  for (const match of html.matchAll(pattern)) {
    const url = new URL(match[1], pageUrl);
    if (url.origin === baseUrl && url.pathname.startsWith("/assets/")) {
      url.search = "";
      urls.add(url.href);
    }
  }
  return urls;
}

function cssAssetUrls(css, cssUrl) {
  const urls = new Set();
  for (const match of css.matchAll(/url\((['"]?)([^)'"]+)\1\)/gi)) {
    if (match[2].startsWith("data:")) continue;
    const url = new URL(match[2], cssUrl);
    if (url.origin === baseUrl && url.pathname.startsWith("/assets/")) {
      url.search = "";
      urls.add(url.href);
    }
  }
  return urls;
}

async function saveAsset(url) {
  const parsed = new URL(url);
  const relativePath = parsed.pathname.replace(/^\/+/, "");
  const output = path.join(publicRoot, relativePath);
  const fitOutput = path.join(fitPublicRoot, relativePath);
  await mkdir(path.dirname(output), { recursive: true });
  await mkdir(path.dirname(fitOutput), { recursive: true });

  let body;
  try {
    body = await readFile(output);
  } catch {
    body = null;
  }
  if (!body) {
    ({ body } = await fetchBuffer(url));
    await writeFile(output, body);
  }
  await writeFile(fitOutput, body);

  if (parsed.pathname.endsWith(".css")) {
    const css = body.toString("utf8");
    return cssAssetUrls(css, url);
  }
  return new Set();
}

const metadata = [];
const assets = new Set();

for (const page of pages) {
  const url = `${baseUrl}/${page}`;
  const result = await fetchBuffer(url);
  const html = result.body.toString("utf8");
  await writeFile(path.join(researchRoot, "pages", page), html);
  await writeFile(path.join(publicRoot, "pages", page), html);
  for (const asset of assetUrls(html, url)) assets.add(asset);
  metadata.push({
    page,
    url,
    finalUrl: result.finalUrl,
    contentType: result.contentType,
    bytes: result.body.length,
    title: html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1].trim() ?? "",
  });
}

const queue = [...assets];
for (let index = 0; index < queue.length; index += 1) {
  for (const nested of await saveAsset(queue[index])) {
    if (!assets.has(nested)) {
      assets.add(nested);
      queue.push(nested);
    }
  }
}

await writeFile(
  path.join(researchRoot, "manifest.json"),
  `${JSON.stringify(
    {
      source: baseUrl,
      fetchedAt: new Date().toISOString(),
      pages: metadata,
      assets: [...assets].sort(),
    },
    null,
    2,
  )}\n`,
);

console.log(`Downloaded ${metadata.length} pages and ${assets.size} assets.`);
