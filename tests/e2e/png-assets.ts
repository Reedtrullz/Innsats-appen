import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { waitForServiceWorker } from './helpers';

const prefix = '/content-assets/docx_7.7-Opplringsplan-for-beredskapsvakt-ved-sivilforsvarsdistriktene__image';
const illustrations = [
  { path: `${prefix}2.png`, bytes: 315444, width: 635, height: 1187,
    encoded: 'f09d0488df043d4cff6ceb81a68697a9567a34e0d189f4978ab10e6d14455ccf',
    pixels: '6dff24b279ec3f1a9ea147a32ac68fd624bbe628f518c50770c789c78463f07a' },
  { path: `${prefix}3.png`, bytes: 227109, width: 715, height: 1342,
    encoded: 'd3e4fe1dd94061d78a60821fc90fda777ad542b3b3c04a8495d50ccae63a3fc7',
    pixels: '172bae2f55f4d5969fa387ce747d10b7763040b7074c6676ab889f7fb8471169' },
];

export function registerIllustrationByteCheck() {
  test('lossless illustration bytes and pixels survive build, serving and offline cache', async ({ page, context, request }) => {
    for (const image of illustrations) {
      const source = readFileSync(`public${image.path}`);
      expect(createHash('sha256').update(source).digest('hex')).toBe(image.encoded);
      const response = await request.get(image.path);
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('image/png');
      const body = await response.body();
      expect(body.length).toBe(image.bytes);
      expect(createHash('sha256').update(body).digest('hex')).toBe(image.encoded);
    }
    await page.goto('/');
    await waitForServiceWorker(page);
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    for (const offline of [false, true]) {
      await context.setOffline(offline);
      try {
        const decoded = await page.evaluate(async images => {
          const hash = async (bytes: Uint8Array<ArrayBuffer>) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)))
            .map(byte => byte.toString(16).padStart(2, '0')).join('');
          return Promise.all(images.map(async image => {
            const response = await fetch(image.path);
            if (!response.ok) throw new Error(`Illustration fetch failed: ${response.status}`);
            const bytes = new Uint8Array(await response.arrayBuffer());
            const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
            try {
              const canvas = document.createElement('canvas');
              canvas.width = bitmap.width; canvas.height = bitmap.height;
              const drawing = canvas.getContext('2d');
              if (!drawing) throw new Error('Canvas unavailable');
              drawing.drawImage(bitmap, 0, 0);
              const rgba = drawing.getImageData(0, 0, bitmap.width, bitmap.height).data;
              const rgb = new Uint8Array(bitmap.width * bitmap.height * 3);
              for (let pixel = 0; pixel < rgba.length / 4; pixel++) {
                if (rgba[pixel * 4 + 3] !== 255) throw new Error('Unexpected transparency');
                rgb.set(rgba.subarray(pixel * 4, pixel * 4 + 3), pixel * 3);
              }
              return { path: image.path, bytes: bytes.length, width: bitmap.width, height: bitmap.height,
                encoded: await hash(bytes), pixels: await hash(rgb) };
            } finally { bitmap.close(); }
          }));
        }, illustrations);
        expect(decoded).toEqual(illustrations);
      } finally { await context.setOffline(false); }
    }
  });
}
