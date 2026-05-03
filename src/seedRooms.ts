import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const roomsData = [
  // 10 Available Rooms
  { name: "Ocean Deluxe", roomNumber: "101", type: "Deluxe", pricePerNight: 450, status: "available", description: "Breathtaking ocean views with a king-sized bed.", features: ["Ocean View", "King Bed", "Mini Bar"], imageUrl: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80" },
  { name: "Garden Standard", roomNumber: "102", type: "Standard", pricePerNight: 200, status: "available", description: "Quiet room overlooking the lush hotel gardens.", features: ["Garden View", "Queen Bed", "Wifi"], imageUrl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80" },
  { name: "Skyline Suite", roomNumber: "201", type: "Suite", pricePerNight: 850, status: "available", description: "Top-floor suite with panoramic city skyline views.", features: ["Skyline View", "Living Area", "Balcony"], imageUrl: "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80" },
  { name: "Mountain View", roomNumber: "202", type: "Standard", pricePerNight: 220, status: "available", description: "Cozy room with direct views of the distant mountains.", features: ["Mountain View", "Twin Beds", "Desk"], imageUrl: "https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80" },
  { name: "Royal Presidential", roomNumber: "501", type: "Presidential", pricePerNight: 3500, status: "available", description: "The ultimate luxury experience with private butler service.", features: ["Private Pool", "Butler Service", "Gourmet Kitchen"], imageUrl: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80" },
  { name: "Family Comfort", roomNumber: "103", type: "Standard", pricePerNight: 300, status: "available", description: "Spacious room designed for families with kids.", features: ["Two Queen Beds", "Kid-Friendly", "Fridge"], imageUrl: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80" },
  { name: "Business Deluxe", roomNumber: "301", type: "Deluxe", pricePerNight: 480, status: "available", description: "Perfect for business travelers with high-speed internet.", features: ["Gigabit Wifi", "Ergonomic Chair", "Safe"], imageUrl: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=800&q=80" },
  { name: "Sunset Terrace", roomNumber: "302", type: "Suite", pricePerNight: 950, status: "available", description: "Suite with a large terrace perfect for sunset viewing.", features: ["Terrace", "Outdoor Seating", "Wine Cooler"], imageUrl: "https://images.unsplash.com/photo-1590490359683-658d3d23f972?auto=format&fit=crop&w=800&q=80" },
  { name: "Zen Minimalist", roomNumber: "401", type: "Deluxe", pricePerNight: 420, status: "available", description: "Relaxing minimalist design for a peaceful stay.", features: ["Zen Decor", "Soaking Tub", "Organic Linens"], imageUrl: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80" },
  { name: "Harmony Standard", roomNumber: "402", type: "Standard", pricePerNight: 210, status: "available", description: "Well-balanced room with modern amenities.", features: ["Smart TV", "Coffee Maker", "USB Ports"], imageUrl: "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80" },

  // 5 Booked Rooms
  { name: "Coral Deluxe", roomNumber: "203", type: "Deluxe", pricePerNight: 460, status: "booked", description: "Popular choice for weekend getaways.", features: ["Pool Access", "King Bed"], imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80" },
  { name: "Azure Suite", roomNumber: "204", type: "Suite", pricePerNight: 820, status: "booked", description: "Elegant suite with deep blue maritime theme.", features: ["Lounge Access", "Premium Sound System"], imageUrl: "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80" },
  { name: "Urban Standard", roomNumber: "303", type: "Standard", pricePerNight: 250, status: "booked", description: "Modern urban design in the heart of the hotel.", features: ["City View", "Queen Bed"], imageUrl: "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=800&q=80" },
  { name: "Emerald Deluxe", roomNumber: "304", type: "Deluxe", pricePerNight: 490, status: "booked", description: "Luxurious room with emerald stone accents.", features: ["Rain Shower", "Mini Bar"], imageUrl: "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80" },
  { name: "Pearl Suite", roomNumber: "403", type: "Suite", pricePerNight: 900, status: "booked", description: "Sophisticated suite for special occasions.", features: ["Jacuzzi", "Champagne Service"], imageUrl: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80" },

  // 3 Maintenance Rooms
  { name: "Terrace Classic", roomNumber: "105", type: "Standard", pricePerNight: 180, status: "maintenance", description: "Undergoing floor renovation.", features: ["Terrace", "Queen Bed"], imageUrl: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80" },
  { name: "Regency Suite", roomNumber: "305", type: "Suite", pricePerNight: 880, status: "maintenance", description: "AC system upgrade in progress.", features: ["Historical Decor", "Large Living Area"], imageUrl: "https://images.unsplash.com/photo-1566195992011-5f6b21e539aa?auto=format&fit=crop&w=800&q=80" },
  { name: "Grand Imperial", roomNumber: "502", type: "Presidential", pricePerNight: 3200, status: "maintenance", description: "Annual pool maintenance.", features: ["Private Balcony", "Walk-in Closet"], imageUrl: "https://images.unsplash.com/photo-1571011264250-9856f70914fe?auto=format&fit=crop&w=800&q=80" }
];

async function seed() {
  console.log("Seeding rooms...");
  const roomsCol = collection(db, "rooms");
  
  for (const room of roomsData) {
    try {
      const docRef = await addDoc(roomsCol, {
        ...room,
        createdAt: serverTimestamp()
      });
      console.log(`Added room: ${room.name} (${room.roomNumber}) with ID: ${docRef.id}`);
    } catch (e) {
      console.error(`Error adding room ${room.name}:`, e);
    }
  }
  console.log("Seeding complete!");
  process.exit(0);
}

seed();
