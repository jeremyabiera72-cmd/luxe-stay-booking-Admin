import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function check() {
  const rooms = await getDocs(collection(db, 'rooms'));
  const bookings = await getDocs(collection(db, 'bookings'));
  console.log(`CURRENT DATABASE STATE:`);
  console.log(`Rooms: ${rooms.size}`);
  console.log(`Bookings: ${bookings.size}`);
  process.exit(0);
}

check();
