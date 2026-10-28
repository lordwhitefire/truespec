import { readdirSync } from 'node:fs';
import path from 'node:path';

import { SITE_ORIGIN } from '../lib/site';

const KEY_FILE = /^[a-f0-9]{32}\.txt$/i;
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

/**
 * Submit the live sitemap's URLs to IndexNow.
 *
 * The key is public by design; this script reads `INDEXNOW_KEY` or the one 32-hex key file already
 * in `public/`. `--dry-run` prints what would be sent without calling the endpoint.
 */
async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  const baseUrl = process.env.INDEXNOW_BASE_URL ?? SITE_ORIGIN;
  const host = new URL(baseUrl).host;
  const sitemapUrl = new URL('/sitemap.xml', baseUrl).toString();

  const sitemap = await fetch(sitemapUrl);
  if (!sitemap.ok) throw new Error(`sitemap ${sitemapUrl} answered ${sitemap.status}`);

  const urls = [...(await sitemap.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map((match) =>
    match[1].trim()
  );
  if (urls.length === 0) throw new Error(`sitemap ${sitemapUrl} contained no <loc> URLs`);

  const key = resolveKey();
  const payload = {
    host,
    key,
    keyLocation: new URL(`/${key}.txt`, baseUrl).toString(),
    urlList: urls,
  };

  if (dryRun) {
    console.log(`Dry run: ${urls.length} URLs for ${host}`);
    console.log(`Key file: ${payload.keyLocation}`);
    for (const url of urls) console.log(url);
    return;
  }

  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify(payload),
  });

  console.log(`IndexNow answered ${response.status} ${response.statusText}`);
  const body = await response.text();
  if (body) console.log(body);
  if (!response.ok) process.exitCode = 1;
}

function resolveKey(): string {
  const envKey = process.env.INDEXNOW_KEY?.trim();
  if (envKey) {
    if (!/^[a-f0-9]{32}$/i.test(envKey)) {
      throw new Error('INDEXNOW_KEY must be exactly 32 hex characters');
    }
    return envKey;
  }

  const files = readdirSync(path.join(process.cwd(), 'public')).filter((name) =>
    KEY_FILE.test(name)
  );
  if (files.length !== 1) {
    throw new Error('Set INDEXNOW_KEY or keep exactly one 32-hex key file in public/');
  }
  return files[0].replace(/\.txt$/i, '');
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
