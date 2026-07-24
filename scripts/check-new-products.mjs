// Used by .github/workflows/daily-product-deploy.yml to decide whether the
// scheduled nightly job should bother rebuilding + deploying at all. Compares
// today's Firestore product IDs against the snapshot committed at
// .deploy-state/known-product-ids.json from the last time this script found
// (and deployed) something new, so a quiet night is a no-op instead of a
// pointless daily redeploy.
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs } from 'firebase/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, '..');
const STATE_DIR = path.join(ROOT_DIR, '.deploy-state');
const STATE_FILE = path.join(STATE_DIR, 'known-product-ids.json');

const firebaseConfig = JSON.parse(readFileSync(path.join(ROOT_DIR, 'firebase-applet-config.json'), 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, { experimentalForceLongPolling: true }, firebaseConfig.firestoreDatabaseId);

function setOutput(hasNew) {
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `new_products=${hasNew}\n`);
  }
}

async function main() {
  const snap = await getDocs(collection(db, 'products'));
  const currentIds = snap.docs.map((d) => d.id).sort();

  const previousIds = existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, 'utf-8')) : [];
  const previousSet = new Set(previousIds);
  const newIds = currentIds.filter((id) => !previousSet.has(id));
  const hasNew = newIds.length > 0;

  console.log(
    hasNew
      ? `[check-new-products] Found ${newIds.length} new product(s): ${newIds.join(', ')}`
      : '[check-new-products] No new products since last deploy — skipping build/deploy.'
  );

  if (hasNew) {
    if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
    writeFileSync(STATE_FILE, JSON.stringify(currentIds, null, 2) + '\n');
  }

  setOutput(hasNew);
  process.exit(0);
}

main().catch((err) => {
  console.error('[check-new-products] Failed to check for new products:', err);
  // Fail closed: if we can't tell, don't deploy — better a missed nightly run
  // than an infinite retry loop on a persistent error.
  setOutput(false);
  process.exit(0);
});
