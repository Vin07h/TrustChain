import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";

// In-memory database for prototype
const db = {
  users: new Map<string, any>(),
  certificates: new Map<string, any>(),
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // --- API Routes ---

  // 1. Auth Mock
  app.post("/api/auth/login", (req, res) => {
    const { uid, email, displayName } = req.body;
    let user = db.users.get(uid);
    if (!user) {
      // New user, but don't save yet - wait for role selection
      return res.json({ newUser: true });
    }
    res.json({ newUser: false, user });
  });

  app.post("/api/users", (req, res) => {
    const { uid, email, displayName, role } = req.body;
    const newUser = {
      uid,
      email,
      displayName,
      role,
      skills: [],
      createdAt: new Date().toISOString()
    };
    db.users.set(uid, newUser);
    res.json(newUser);
  });

  app.get("/api/users/:uid", (req, res) => {
    const user = db.users.get(req.params.uid);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  });

  app.get("/api/seekers", (req, res) => {
    const seekers = Array.from(db.users.values()).filter(u => u.role === 'seeker');
    res.json(seekers);
  });

  // 2. Certificates
  app.post("/api/certificates", (req, res) => {
    const cert = { ...req.body, id: Math.random().toString(36).substring(7), createdAt: new Date().toISOString() };
    db.certificates.set(cert.id, cert);
    
    // Update user skills
    const user = db.users.get(cert.seekerUid);
    if (user) {
      user.skills = Array.from(new Set([...(user.skills || []), ...(cert.keywords || [])]));
      db.users.set(cert.seekerUid, user);
    }
    
    res.json(cert);
  });

  app.get("/api/certificates", (req, res) => {
    const { seekerUid, certHash } = req.query;
    let certs = Array.from(db.certificates.values());
    if (seekerUid) certs = certs.filter(c => c.seekerUid === seekerUid);
    if (certHash) certs = certs.filter(c => c.certHash === certHash);
    res.json(certs);
  });

  // 3. CNN Verification Mock
  app.post("/api/verify-cnn", (req, res) => {
    const { certificateUrl } = req.body;
    
    // Simple deterministic hash function for the mock
    let hash = 0;
    const str = certificateUrl || "";
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Generate a deterministic score between 70 and 98
    const trustScore = 70 + (Math.abs(hash) % 29);
    
    res.json({
      trustScore,
      verified: trustScore >= 80,
      details: {
        logoDetected: true,
        signatureMatch: true,
        layoutConsistency: "High"
      }
    });
  });

  // 4. Job Search API (Simplified, now handled by frontend Gemini)
  app.get("/api/jobs", async (req, res) => {
    res.json([]);
  });

  // 5. Chatbot API (Simplified, now handled by frontend Gemini)
  app.post("/api/chat", async (req, res) => {
    res.json({ response: "Please use the frontend chat service." });
  });
  
  // 6. Notification Mock
  app.post("/api/notify", (req, res) => {
    const { to, subject, body } = req.body;
    console.log(`[EMAIL NOTIFICATION SENT]`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${body}`);
    res.json({ success: true, message: "Notification sent successfully" });
  });

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

startServer();
