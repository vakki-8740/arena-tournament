const admin = require('firebase-admin');
let db = null;

async function initDatabase() {
    try {
        const serviceAccount = require('./serviceAccountKey.json');
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        db = admin.firestore();
        console.log('Firestore connected via serviceAccountKey.json!');
    } catch (e1) {
        try {
            const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({ credential: admin.credential.cert(sa) });
            db = admin.firestore();
            console.log('Firestore connected via FIREBASE_SERVICE_ACCOUNT env!');
        } catch (e2) {
            console.error('WARNING: Firebase not configured. Database will not work.');
            console.error('Set FIREBASE_SERVICE_ACCOUNT env var on Render OR add serviceAccountKey.json to repo.');
        }
    }
}

module.exports = { initDatabase, db: () => db, admin };
