const admin = require('firebase-admin');
let db = null;

async function initDatabase() {
    try {
        const serviceAccount = require('./serviceAccountKey.json');
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } catch (e) {
        console.log('serviceAccountKey.json not found, trying FIREBASE_SERVICE_ACCOUNT env...');
        const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({ credential: admin.credential.cert(sa) });
    }
    db = admin.firestore();
    console.log('Firestore connected!');
}

module.exports = { initDatabase, db: () => db, admin };
