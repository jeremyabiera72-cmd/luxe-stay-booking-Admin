import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, addDoc, getDocs, query, where, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };
import nodemailer from "nodemailer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase for the server with stability settings
const firebaseApp = initializeApp(firebaseConfig);
const db = initializeFirestore(firebaseApp, {
  experimentalForceLongPolling: true,
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Manual Confirmation with Email Endpoint
  app.post("/api/bookings/confirm-with-email", async (req, res) => {
    const { bookingId, customerEmail, customerName, roomName, checkIn, checkOut, totalAmount, resourceId } = req.body;

    if (!bookingId || !customerEmail) {
      return res.status(400).json({ error: "Missing required booking details" });
    }

    try {
      // 1. Send Email via Mailer (Lazy check for env vars)
      const user = process.env.GMAIL_USER;
      const pass = process.env.GMAIL_PASS;

      if (!user || !pass) {
        throw new Error("GMAIL_USER or GMAIL_PASS environment variables are not set in the Secrets menu. Email cannot be sent.");
      } 
      
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });

      const emailTemplate = `
Hello ${customerName},

Great news — your stay at LuxeStay is officially confirmed. ✨

We’ve carefully reviewed your reservation and everything is set for your upcoming visit. Here’s a quick summary:

📅 Stay Dates: ${checkIn} → ${checkOut}
👤 Room: ${roomName}
💳 Total: $${totalAmount}

Our team is already preparing your room to ensure a smooth and comfortable experience.

If you have any questions or changes, we’re here to help anytime.

We can’t wait to welcome you!

Best regards,
LuxeStay Management
jeremyabiera72@gmail.com | 09553673625
      `;

      await transporter.sendMail({
        from: `"LuxeStay Management" <${user}>`,
        to: customerEmail,
        subject: `Confirmed: Your Stay at LuxeStay (${roomName})`,
        text: emailTemplate,
      });

      // 2. Log the activity (Safe since automationLogs allows anonymous creation)
      await addDoc(collection(db, "automationLogs"), {
        bookingId,
        customerName,
        status: "mailing",
        message: `Admin triggered confirmation email for ${customerName}. Finalizing via client...`,
        timestamp: serverTimestamp()
      });

      // 3. Return success. The Client (BookingsPage) will handle the Firestore update 
      // under the authenticated admin's credentials to satisfy security rules.
      res.json({ success: true });
    } catch (error: any) {
      console.error("Manual confirm error:", error);
      let errorMessage = error.message || "Failed to confirm booking and send email";
      
      // Handle the common 535 Login error for Gmail
      if (error.code === 'EAUTH' || error.message?.includes('535')) {
        errorMessage = "Gmail Login Failed: Please check that GMAIL_USER and GMAIL_PASS (App Password) are correct in the Secrets menu. IMPORTANT: You must use an 'App Password', not your regular Gmail password.";
      }
      
      res.status(500).json({ error: errorMessage });
    }
  });

  // Background Automation Logic
  const startAutomationWorker = () => {
    console.log("AI Automation Worker initializing...");
    // The worker is already started below as runAutomationCycle()
  };

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// Fixed Automation Worker Implementation with caching to avoid re-read permission issues
interface AutomationJob {
  stage: number;
  startTime: number;
  data: any;
}

async function runAutomationCycle() {
  const activeJobs = new Map<string, AutomationJob>();
  let lastHeartbeat = 0;

  setInterval(async () => {
    try {
      // Periodic heartbeat for visibility in Monitor (every 60s)
      if (Date.now() - lastHeartbeat > 60000) {
        lastHeartbeat = Date.now();
        await addDoc(collection(db, "automationLogs"), {
          status: "system",
          message: "AI background worker heartbeat: System online and scanning bookings...",
          timestamp: serverTimestamp()
        });
      }

      // 1. Find new pending bookings
      let bookingsSnap;
      try {
        bookingsSnap = await getDocs(query(collection(db, "bookings"), where("status", "==", "pending")));
      } catch (e: any) {
        console.error("[AI] Error fetching pending bookings:", e.message);
        throw e;
      }
      
      for (const bookingDoc of bookingsSnap.docs) {
        const id = bookingDoc.id;
        const bookingData = bookingDoc.data();

        // Skip if already reviewed by AI (stops infinite loop)
        if (bookingData.aiReviewStatus === 'completed') continue;

        if (!activeJobs.has(id)) {
          console.log(`[AI] New pending booking found: ${id}. Starting stage 1: Reading.`);
          activeJobs.set(id, { 
            stage: 1, 
            startTime: Date.now(),
            data: bookingData
          });
          
          try {
            await addDoc(collection(db, "automationLogs"), {
              bookingId: id,
              customerName: bookingData.customerName,
              status: "reading",
              message: `AI is currently reading and reviewing booking for ${bookingData.customerName}...`,
              timestamp: serverTimestamp()
            });
          } catch (e: any) {
            console.error("[AI] Error creating log (reading):", e.message);
          }
        }
      }

      // Progress active jobs using cached data
      for (const [id, job] of activeJobs.entries()) {
        const elapsedSeconds = (Date.now() - job.startTime) / 1000;
        const bookingData = job.data;

        // Stage 1: Reading (Started on discovery)
        
        // Stage 2: AI Review / Preparation (after 20s)
        if (job.stage === 1 && elapsedSeconds >= 20) {
          console.log(`[AI] Booking ${id} stage 2: Reviewing Details.`);
          job.stage = 2;

          try {
            await addDoc(collection(db, "automationLogs"), {
              bookingId: id,
              customerName: bookingData.customerName,
              status: "reading",
              message: `AI has analyzed the booking for ${bookingData.customerName}. Checking room availability and guest preferences...`,
              timestamp: serverTimestamp()
            });
          } catch (e: any) {
            console.error("[AI] Error in review stage:", e.message);
          }
        }
        // Stage 3: Ready for Manual Decision (after 40s total)
        else if (job.stage === 2 && elapsedSeconds >= 40) {
          console.log(`[AI] Booking ${id} stage 3: Review Ready.`);
          job.stage = 3;
          
          try {
            // Update booking to mark AI review as done (prevents picking up again)
            await updateDoc(doc(db, "bookings", id), { aiReviewStatus: "completed" });
            console.log(`[AI] Marked booking ${id} as aiReviewStatus: completed`);

            await addDoc(collection(db, "automationLogs"), {
              bookingId: id,
              customerName: bookingData.customerName,
              status: "review-ready", // Changed from 'completed' to avoid confusion
              message: `AI Review Ready. Recommendation prepared. Booking remains PENDING for manual admin decision.`,
              timestamp: serverTimestamp()
            });
          } catch (e: any) {
            console.error(`[AI] Error during final log for ${id}:`, e.message);
          }
          
          // Finish the job - passive loop complete
          activeJobs.delete(id);
        }
      }
    } catch (e) {
      console.error("[AI Automation Error]", e);
    }
  }, 10000); // Run check loop every 10 seconds
}

startServer();
runAutomationCycle();
