// Firebase Configuration Module
// Handles initialization of Firebase Admin SDK with credentials from environment variables

const admin = require('firebase-admin');
const path = require('path');

let db = null;
let isInitialized = false;

/**
 * Initialize Firebase Admin SDK
 * Requires environment variables:
 * - FIREBASE_PROJECT_ID
 * - FIREBASE_PRIVATE_KEY
 * - FIREBASE_CLIENT_EMAIL
 */
function initializeFirebase() {
  if (isInitialized && db) {
    console.log('[Firebase] Already initialized');
    return db;
  }

  try {
    // Allow two ways to provide credentials:
    // 1) GOOGLE_APPLICATION_CREDENTIALS pointing to a service account JSON file
    // 2) Individual env vars: FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL

    let serviceAccount = null;

    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        const credsPath = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);
        serviceAccount = require(credsPath);
        console.log('[Firebase] Using service account JSON from GOOGLE_APPLICATION_CREDENTIALS');
      } catch (err) {
        console.warn('[Firebase] Failed to load GOOGLE_APPLICATION_CREDENTIALS:', err.message);
      }
    }

    if (!serviceAccount && process.env.FIREBASE_PROJECT_ID) {
      serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      };
      console.log('[Firebase] Using service account from environment variables');
    }

    if (!serviceAccount) {
      console.warn('[Firebase] No service account configured - running in demo mode (in-memory storage)');
      return null;
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });

    db = admin.firestore();
    isInitialized = true;

    console.log('[Firebase] ✅ Initialized successfully');
    console.log(`[Firebase] Project: ${process.env.FIREBASE_PROJECT_ID}`);

    return db;
  } catch (error) {
    console.error('[Firebase] ❌ Initialization failed:', error.message);
    console.warn('[Firebase] Will use in-memory storage as fallback');
    return null;
  }
}

/**
 * Get Firestore database instance
 * Returns null if Firebase is not configured
 */
function getDatabase() {
  return db;
}

/**
 * Check if Firebase is properly initialized
 */
function isFirebaseReady() {
  return db !== null && isInitialized;
}

module.exports = {
  initializeFirebase,
  getDatabase,
  isFirebaseReady,
};
