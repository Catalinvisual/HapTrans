// Rebuilds the HapCargo launcher icon from the existing artwork.
//
// The previous icons wrapped the logo in an extra rounded white "card" with a
// light border, so the mark looked small. This script finds the actual artwork
// (the saturated orange/navy pixels), crops it away from the card, and composes
// it:
//   • legacy icons    → full-bleed white square, mark at 86% of the canvas
//   • adaptive layers → transparent foreground, mark inside Android's 66% safe
//                       zone, white background layer
const fs = require('fs');
const path = require('path');
const sharp = require('../server/node_modules/sharp');

const RES = 'mobile/android/app/src/main/res';
// Never read the file this script writes: keep the full-resolution original
// artwork in assets so icon generation is repeatable without quality loss.
const SOURCE = 'mobile/assets/images/app_icon_source.png';

const LEGACY = { 'mipmap-mdpi': 48, 'mipmap-hdpi': 72, 'mipmap-xhdpi': 96, 'mipmap-xxhdpi': 144, 'mipmap-xxxhdpi': 192 };
const ADAPTIVE = { 'mipmap-mdpi': 108, 'mipmap-hdpi': 162, 'mipmap-xhdpi': 216, 'mipmap-xxhdpi': 324, 'mipmap-xxxhdpi': 432 };

const isLogoPixel = (r, g, b, a) => {
  if (a < 40) return false;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max - min > 45; // saturated: orange H or navy C, not white / grey / border
};

async function artworkBox() {
  const { data, info } = await sharp(SOURCE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const i = (y * info.width + x) * 4;
      if (isLogoPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error('No logo pixels found in the source icon');
  return { minX, minY, maxX, maxY, width: info.width, height: info.height };
}

async function squareArtwork(box) {
  const w = box.maxX - box.minX + 1;
  const h = box.maxY - box.minY + 1;
  // Tight crop: the source artwork is a logo inside a rounded white card. The
  // card's border must not survive the crop, so keep only the saturated marks
  // and make every other pixel transparent.
  const side = Math.round(Math.max(w, h) * 1.02);
  let left = Math.round(box.minX - (side - w) / 2);
  let top = Math.round(box.minY - (side - h) / 2);
  left = Math.max(0, Math.min(left, box.width - side));
  top = Math.max(0, Math.min(top, box.height - side));

  const { data, info } = await sharp(SOURCE)
    .extract({ left, top, width: side, height: side })
    .resize(1024, 1024, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    // Keep the coloured mark only (orange H, navy C). White card, grey border
    // and the soft shadow all have low saturation and are dropped.
    const saturation = Math.max(r, g, b) - Math.min(r, g, b);
    if (saturation < 32) data[i + 3] = 0;
  }

  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();
}

async function compose(artwork, size, ratio, background) {
  const inner = Math.round(size * ratio);
  const mark = await sharp(artwork).resize(inner, inner, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toBuffer();
  const offset = Math.round((size - inner) / 2);
  return sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: mark, left: offset, top: offset }])
    .png()
    .toBuffer();
}

(async () => {
  const box = await artworkBox();
  console.log('artwork box', box);
  const artwork = await squareArtwork(box);

  for (const [dir, size] of Object.entries(LEGACY)) {
    const out = path.join(RES, dir, 'ic_launcher.png');
    await sharp(await compose(artwork, size, 0.86, { r: 255, g: 255, b: 255, alpha: 1 })).toFile(out);
    console.log('legacy', dir, size);
  }

  for (const [dir, size] of Object.entries(ADAPTIVE)) {
    const out = path.join(RES, dir, 'ic_launcher_foreground.png');
    await sharp(await compose(artwork, size, 0.62, { r: 255, g: 255, b: 255, alpha: 0 })).toFile(out);
    console.log('adaptive', dir, size);
  }

  const xmlDir = path.join(RES, 'mipmap-anydpi-v26');
  fs.mkdirSync(xmlDir, { recursive: true });
  fs.writeFileSync(
    path.join(xmlDir, 'ic_launcher.xml'),
    '<?xml version="1.0" encoding="utf-8"?>\n' +
      '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n' +
      '    <background android:drawable="@color/ic_launcher_background" />\n' +
      '    <foreground android:drawable="@mipmap/ic_launcher_foreground" />\n' +
      '</adaptive-icon>\n',
  );
  console.log('adaptive icon xml written');
})();
