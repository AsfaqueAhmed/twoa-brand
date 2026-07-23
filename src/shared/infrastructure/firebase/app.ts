import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import firebaseConfig from '../../../../firebase-applet-config.json';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Persist Firestore reads to IndexedDB so repeat visits (and offline use) don't
// re-fetch catalog/product data — including large embedded base64 images — over
// the network. Only attempted in the browser (IndexedDB doesn't exist during the
// static export build), and falls back to the default in-memory cache if a
// second tab/HMR reload has already initialized Firestore for this app.
function createDb() {
  if (typeof window === 'undefined') {
    return getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
  try {
    return initializeFirestore(
      app,
      { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    return getFirestore(app, firebaseConfig.firestoreDatabaseId);
  }
}

export const db = createDb();
