// One-off migration: copies real data out of Firestore into Supabase, and
// rehosts every embedded base64 image in Supabase Storage. Not part of the
// app build — run manually, once, before cutting the app over to Supabase.
//
// Requires:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   — service_role bypasses RLS,
//     needed since this script writes as an unauthenticated script, not as
//     the admin user.
//   FIREBASE_SERVICE_ACCOUNT_PATH (optional)  — path to a Firebase service
//     account JSON (Firebase Console > Project Settings > Service Accounts).
//     Only needed to migrate `orders`, since firestore.rules restricts
//     listing that collection to the signed-in admin; every other
//     collection is publicly readable, so it's fetched with the same public
//     client config the storefront itself uses (see generate-product-feed.mjs).
//
// Safe to re-run: every write is an upsert keyed on the original Firestore
// document ID, so a partial failure can be fixed and the script rerun.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs } from 'firebase/firestore';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const IMAGE_BUCKET = 'images';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[migrate] Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars.');
  process.exit(1);
}

const firebaseConfig = JSON.parse(readFileSync(path.join(ROOT_DIR, 'firebase-applet-config.json'), 'utf-8'));
const firebaseApp = initializeApp(firebaseConfig);
const db = initializeFirestore(firebaseApp, { experimentalForceLongPolling: true }, firebaseConfig.firestoreDatabaseId);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function extensionForDataUrl(dataUrl) {
  const match = /^data:image\/(\w+);base64,/.exec(dataUrl);
  const type = match?.[1] ?? 'jpeg';
  return type === 'jpeg' ? 'jpg' : type;
}

async function uploadImage(storagePath, dataUrl) {
  if (!dataUrl || !dataUrl.startsWith('data:')) return dataUrl ?? null;
  const base64 = dataUrl.split(',')[1] ?? '';
  const ext = extensionForDataUrl(dataUrl);
  const fullPath = `${storagePath}.${ext}`;
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(fullPath, Buffer.from(base64, 'base64'), { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`, upsert: true });
  if (error) throw new Error(`upload ${fullPath}: ${error.message}`);
  return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(fullPath).data.publicUrl;
}

function toISO(value) {
  if (value?.toDate) return value.toDate().toISOString();
  if (typeof value === 'string' && value) return value;
  return new Date().toISOString();
}

async function migrateCategories() {
  const snap = await getDocs(collection(db, 'categories'));
  const rows = snap.docs.map((d) => ({ id: d.id, name: d.data().name, subcategories: d.data().subcategories || [] }));
  if (rows.length === 0) return 0;
  const { error } = await supabase.from('categories').upsert(rows);
  if (error) throw error;
  return rows.length;
}

async function migrateSizeCharts() {
  const snap = await getDocs(collection(db, 'sizeCharts'));
  const rows = snap.docs.map((d) => ({
    id: d.id,
    name: d.data().name,
    columns: d.data().columns || [],
    rows: d.data().rows || [],
  }));
  if (rows.length === 0) return 0;
  const { error } = await supabase.from('size_charts').upsert(rows);
  if (error) throw error;
  return rows.length;
}

async function migrateParentProducts() {
  const snap = await getDocs(collection(db, 'parentProducts'));
  const parentRows = snap.docs.map((d) => ({ id: d.id, name: d.data().name, size_order: d.data().sizeOrder || [] }));
  if (parentRows.length > 0) {
    const { error } = await supabase.from('parent_products').upsert(parentRows);
    if (error) throw error;
  }

  let stockCount = 0;
  for (const parentDoc of snap.docs) {
    const stockSnap = await getDocs(collection(db, 'parentProducts', parentDoc.id, 'sizeStock'));
    const stockRows = stockSnap.docs.map((s) => ({
      parent_id: parentDoc.id,
      size: s.id,
      stock: Number(s.data().stock) || 0,
    }));
    if (stockRows.length === 0) continue;
    const { error } = await supabase.from('parent_product_size_stock').upsert(stockRows, { onConflict: 'parent_id,size' });
    if (error) throw error;
    stockCount += stockRows.length;
  }
  return { parents: parentRows.length, stock: stockCount };
}

async function migrateProducts() {
  const snap = await getDocs(collection(db, 'products'));
  let count = 0;
  for (const productDoc of snap.docs) {
    const data = productDoc.data();
    const id = productDoc.id;

    const imageUrl = await uploadImage(`products/${id}/main`, data.image);

    let variants = null;
    if (Array.isArray(data.variants) && data.variants.length > 0) {
      variants = [];
      for (const variant of data.variants) {
        const variantImageUrl = variant.image
          ? await uploadImage(`products/${id}/variants/${variant.id}`, variant.image)
          : null;
        variants.push({ id: variant.id, name: variant.name, colorCode: variant.colorCode ?? null, image_url: variantImageUrl });
      }
    }

    const row = {
      id,
      name: data.name,
      description: data.description || '',
      price: Number(data.price) || 0,
      original_price: data.originalPrice !== undefined ? Number(data.originalPrice) : null,
      image_url: imageUrl,
      category: data.category,
      subcategory: data.subcategory ?? null,
      rating: Number(data.rating) || 0,
      parent_product_id: data.parentProductId ?? null,
      variants,
      size_chart_id: data.sizeChartId ?? null,
    };
    const { error } = await supabase.from('products').upsert(row);
    if (error) throw new Error(`product ${id}: ${error.message}`);
    count += 1;
  }
  return count;
}

async function migrateCoupons() {
  const snap = await getDocs(collection(db, 'coupons'));
  const rows = snap.docs.map((d) => {
    const data = d.data();
    return {
      code: d.id,
      discount_type: data.discountType,
      value: Number(data.value) || 0,
      min_order_subtotal: data.minOrderSubtotal !== undefined ? Number(data.minOrderSubtotal) : null,
      district_restriction: data.districtRestriction ?? null,
      expires_at: data.expiresAt ?? null,
      usage_limit: data.usageLimit !== undefined ? Number(data.usageLimit) : null,
      usage_count: Number(data.usageCount) || 0,
      is_active: !!data.isActive,
      created_at: toISO(data.createdAt),
      updated_at: toISO(data.updatedAt),
    };
  });
  if (rows.length === 0) return 0;
  const { error } = await supabase.from('coupons').upsert(rows);
  if (error) throw error;
  return rows.length;
}

async function migrateOrderItemImages(orderId, items) {
  const migrated = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const imageUrl = await uploadImage(`orders/${orderId}/${i}`, item.image);
    let selectedVariant = item.selectedVariant;
    if (selectedVariant?.image) {
      const variantImageUrl = await uploadImage(`orders/${orderId}/${i}-variant`, selectedVariant.image);
      selectedVariant = { id: selectedVariant.id, name: selectedVariant.name, colorCode: selectedVariant.colorCode ?? null, image_url: variantImageUrl };
    }
    migrated.push({
      productId: item.productId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image_url: imageUrl,
      selectedSize: item.selectedSize ?? null,
      selectedVariant: selectedVariant ?? null,
      parentProductId: item.parentProductId ?? null,
    });
  }
  return migrated;
}

async function migrateOrders() {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!serviceAccountPath) {
    console.warn(
      '[migrate] Skipping orders: firestore.rules restricts listing orders to the signed-in admin, so this needs ' +
        'Firebase Admin credentials. Set FIREBASE_SERVICE_ACCOUNT_PATH to a service account JSON ' +
        '(Firebase Console > Project Settings > Service Accounts) and rerun to migrate orders.'
    );
    return 0;
  }

  const { initializeApp: initAdminApp, cert } = await import('firebase-admin/app');
  const { getFirestore } = await import('firebase-admin/firestore');
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'));
  const adminApp = initAdminApp({ credential: cert(serviceAccount) }, 'migration-admin');
  const adminDb = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);

  const snap = await adminDb.collection('orders').get();
  let count = 0;
  for (const orderDoc of snap.docs) {
    const data = orderDoc.data();
    const id = orderDoc.id;
    const items = await migrateOrderItemImages(id, data.items || []);

    const row = {
      id,
      user_id: data.userId,
      user_name: data.userName,
      user_email: data.userEmail || '',
      address: data.address,
      phone: data.phone,
      items,
      total_amount: Number(data.totalAmount) || 0,
      promo_code: data.promoCode ?? null,
      discount: data.discount !== undefined ? Number(data.discount) : null,
      status: data.status,
      payment_method: data.paymentMethod || 'cash_on_delivery',
      created_at: toISO(data.createdAt),
      updated_at: toISO(data.updatedAt),
    };
    const { error } = await supabase.from('orders').upsert(row);
    if (error) throw new Error(`order ${id}: ${error.message}`);
    count += 1;
  }
  return count;
}

async function main() {
  console.log('[migrate] categories:', await migrateCategories());
  console.log('[migrate] sizeCharts:', await migrateSizeCharts());
  console.log('[migrate] parentProducts:', await migrateParentProducts());
  console.log('[migrate] products:', await migrateProducts());
  console.log('[migrate] coupons:', await migrateCoupons());
  console.log('[migrate] orders:', await migrateOrders());
  console.log('[migrate] Done.');
  process.exit(0);
}

main().catch((err) => {
  console.error('[migrate] Failed:', err);
  process.exit(1);
});
