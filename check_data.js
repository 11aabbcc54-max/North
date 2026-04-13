
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

const app = initializeApp({
  projectId: config.projectId,
});

const db = getFirestore(app, config.firestoreDatabaseId);

async function check() {
  const collections = ['requests', 'users', 'inventory', 'buildings', 'apartments', 'clubSubscriptions', 'bookings', 'settings'];
  for (const col of collections) {
    const snapshot = await db.collection(col).limit(5).get();
    console.log(`Collection: ${col}, Count: ${snapshot.size}`);
    snapshot.forEach(doc => {
      console.log(`  ID: ${doc.id}, Data: ${JSON.stringify(doc.data()).substring(0, 100)}...`);
    });
  }
}

check().catch(console.error);
