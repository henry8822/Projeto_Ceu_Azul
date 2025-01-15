// firebaseConfig.js
const admin = require('firebase-admin');
const serviceAccount = require('../firebaseServiceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});

const db = admin.firestore();
module.exports = { db };