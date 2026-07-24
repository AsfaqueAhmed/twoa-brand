// Build-time generator for the Meta/Facebook product feed. Runs automatically
// before `next build` (see package.json "prebuild") so `public/product-feed.csv`
// and any rehosted product images are fresh on every deploy — no separate
// server, Storage, or admin-triggered sync needed. Reads Firestore with the
// same public client config the storefront itself uses (products/parentProducts
// are publicly readable per firestore.rules), so no credentials are required.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs } from 'firebase/firestore';

const SITE_URL = 'https://twoa-brand.web.app';
const BRAND_NAME = '2A';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');
const IMAGES_DIR = path.join(PUBLIC_DIR, 'product-images');

const firebaseConfig = JSON.parse(readFileSync(path.join(ROOT_DIR, 'firebase-applet-config.json'), 'utf-8'));

const app = initializeApp(firebaseConfig);
// Plain Node has no browser XHR/WebChannel streaming support, so force long
// polling — the documented workaround for using the Firestore Web SDK outside a browser.
const db = initializeFirestore(app, { experimentalForceLongPolling: true }, firebaseConfig.firestoreDatabaseId);

function csvEscape(value) {
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function extensionForDataUrl(dataUrl) {
  const match = /^data:image\/(\w+);base64,/.exec(dataUrl);
  const type = match?.[1] ?? 'jpg';
  return type === 'jpeg' ? 'jpg' : type;
}

async function fetchParentStockById() {
  const snap = await getDocs(collection(db, 'parentProducts'));
  const parents = new Map();
  for (const parentDoc of snap.docs) {
    const data = parentDoc.data();
    const sizeOrder = Array.isArray(data.sizeOrder) ? data.sizeOrder : [];
    const sizeStockSnap = await getDocs(collection(db, 'parentProducts', parentDoc.id, 'sizeStock'));
    const stockByDocId = new Map(sizeStockSnap.docs.map((d) => [d.id, Number(d.data().stock) || 0]));
    const stockValues = sizeOrder.map((size) => stockByDocId.get(size) ?? 0);
    parents.set(parentDoc.id, stockValues);
  }
  return parents;
}

function isOutOfStock(stockValues) {
  return !stockValues || stockValues.length === 0 || stockValues.every((v) => v <= 0);
}

async function main() {
  const [productsSnap, parentStockById] = await Promise.all([
    getDocs(collection(db, 'products')),
    fetchParentStockById(),
  ]);

  if (!existsSync(IMAGES_DIR)) mkdirSync(IMAGES_DIR, { recursive: true });

  const headers = ['id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link', 'brand'];
  const lines = [headers.join(',')];
  let rehostedCount = 0;

  for (const productDoc of productsSnap.docs) {
    const data = productDoc.data();
    const id = productDoc.id;
    const price = Number(data.price) || 0;
    const image = data.image || '';

    let imageLink = image;
    if (image.startsWith('data:')) {
      const base64 = image.split(',')[1] ?? '';
      const ext = extensionForDataUrl(image);
      writeFileSync(path.join(IMAGES_DIR, `${id}.${ext}`), Buffer.from(base64, 'base64'));
      imageLink = `${SITE_URL}/product-images/${id}.${ext}`;
      rehostedCount += 1;
    }

    const row = {
      id,
      title: data.name || '',
      description: data.description || '',
      availability: isOutOfStock(parentStockById.get(data.parentProductId)) ? 'out of stock' : 'in stock',
      condition: 'new',
      price: `${price.toFixed(2)} BDT`,
      link: `${SITE_URL}/product?id=${encodeURIComponent(id)}`,
      image_link: imageLink,
      brand: BRAND_NAME,
    };
    lines.push(headers.map((h) => csvEscape(row[h])).join(','));
  }

  writeFileSync(path.join(PUBLIC_DIR, 'product-feed.csv'), lines.join('\n'));
  console.log(
    `[product-feed] Generated product-feed.csv with ${productsSnap.docs.length} products (${rehostedCount} images rehosted).`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error('[product-feed] Failed to generate product feed:', err);
  // Don't fail the whole build over the feed — the site itself doesn't depend on it.
  process.exit(0);
});
