require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

const Candidate = require("./models/Candidate");
const Submission = require("./models/Submission");
const Category = require("./models/Category");
const Nomination = require('./models/Nomination');
const Setting = require('./models/Setting');

const app = express();
const PORT = process.env.PORT || 5000;

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer — memory storage (no local disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Middleware
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// ─── ADMIN AUTH ────────────────────────────────────────────────
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    return res.json({ success: true, token: "admin-token-secret" });
  }
  res.status(401).json({ success: false, message: "Invalid credentials" });
});

function adminAuth(req, res, next) {
  const token = req.headers["x-admin-token"];
  if (token === "admin-token-secret") return next();
  res.status(403).json({ message: "Unauthorized" });
}

// ─── ROOT ──────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    message: "🗳️ University Voting API is running.",
    endpoints: {
      candidates: "/api/candidates",
      categories: "/api/categories",
      results: "/api/results",
      submitVote: "/api/submit-vote",
    },
  });
});

// ─── CATEGORIES ────────────────────────────────────────────────
app.get("/api/categories", async (req, res) => {
  try {
    const cats = await Category.find().sort({ name: 1 });
    res.json(cats);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.post("/api/categories", adminAuth, async (req, res) => {
  try {
    const cat = new Category({
      name: req.body.name,
      description: req.body.description || "",
    });
    await cat.save();
    res.status(201).json(cat);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

app.delete("/api/categories/:id", adminAuth, async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ─── CANDIDATES ────────────────────────────────────────────────
app.get("/api/candidates", async (req, res) => {
  try {
    const candidates = await Candidate.find().sort({ category: 1, name: 1 });
    res.json(candidates);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.post("/api/candidates", adminAuth, upload.single("image"), async (req, res) => {
  try {
    const { name, category } = req.body;
    let imageUrl = "";

    if (req.file) {
      // Upload to Cloudinary
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: "univote" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(req.file.buffer);
      });
      imageUrl = result.secure_url;
    }

    const candidate = new Candidate({ name, category, image: imageUrl });
    await candidate.save();
    res.status(201).json(candidate);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

app.delete("/api/candidates/:id", adminAuth, async (req, res) => {
  try {
    const c = await Candidate.findByIdAndDelete(req.params.id);
    // If image is a Cloudinary URL, optionally delete from Cloudinary too
    if (c && c.image && c.image.includes("cloudinary")) {
      const publicId = c.image.split("/").slice(-1)[0].split(".")[0];
      await cloudinary.uploader.destroy(`univote/${publicId}`).catch(() => {});
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ─── SUBMISSIONS ───────────────────────────────────────────────
app.post("/api/submit-vote", async (req, res) => {
  try {
    const { fullName, candidateId, candidateName, category, amountPaid, transactionRef } = req.body;
    if (!fullName || !candidateId || !amountPaid || !transactionRef) {
      return res.status(400).json({ message: "All fields are required." });
    }
    const amount = parseFloat(amountPaid);
    if (isNaN(amount) || amount < 200) {
      return res.status(400).json({ message: "Minimum amount is ₦200." });
    }
    const votes = Math.floor(amount / 200);
    const submission = new Submission({
      fullName, candidateId, candidateName, category,
      amountPaid: amount, votes, transactionRef,
      status: "pending",
    });
    await submission.save();
    res.status(201).json({
      success: true,
      message: "Your vote is awaiting admin approval.",
      submission,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.get("/api/submissions", adminAuth, async (req, res) => {
  try {
    const subs = await Submission.find().sort({ createdAt: -1 });
    res.json(subs);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.post("/api/approve/:id", adminAuth, async (req, res) => {
  try {
    const sub = await Submission.findById(req.params.id);
    if (!sub) return res.status(404).json({ message: "Submission not found" });
    if (sub.status === "approved")
      return res.status(400).json({ message: "Already approved" });

    sub.status = "approved";
    await sub.save();

    await Candidate.findByIdAndUpdate(sub.candidateId, {
      $inc: { votes: sub.votes },
    });
    res.json({
      success: true,
      message: `Approved! ${sub.votes} vote(s) added to ${sub.candidateName}.`,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

app.post("/api/reject/:id", adminAuth, async (req, res) => {
  try {
    const sub = await Submission.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true }
    );
    if (!sub) return res.status(404).json({ message: "Submission not found" });
    res.json({ success: true, message: "Submission rejected." });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ─── RESULTS (public) ─────────────────────────────────────────
app.get("/api/results", async (req, res) => {
  try {
    const candidates = await Candidate.find().sort({ votes: -1 });
    const categories = [...new Set(candidates.map((c) => c.category))];
    const results = categories.map((cat) => ({
      category: cat,
      candidates: candidates
        .filter((c) => c.category === cat)
        .sort((a, b) => b.votes - a.votes),
    }));
    res.json(results);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});
// ─── NOMINATION ROUTES ─────────────────────────────────────────
 
// Submit a nomination (public - no auth needed)
app.post('/api/nominations', async (req, res) => {
  try {
    const { studentName, staffName } = req.body;
    if (!studentName || !staffName) {
      return res.status(400).json({ message: 'Student name and staff name are required.' });
    }
    const nomination = new Nomination({
      studentName: studentName.trim(),
      staffName: staffName.trim(),
    });
    await nomination.save();
    res.status(201).json({ success: true, message: 'Nomination submitted successfully!' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});
 
// Get all nominations (admin only)
app.get('/api/nominations', adminAuth, async (req, res) => {
  try {
    const nominations = await Nomination.find().sort({ createdAt: -1 });
 
    // Count nominations per staff
    const counts = {};
    nominations.forEach(n => {
      const key = n.staffName.toLowerCase().trim();
      if (!counts[key]) counts[key] = { staffName: n.staffName, count: 0 };
      counts[key].count++;
    });
 
    const staffCounts = Object.values(counts).sort((a, b) => b.count - a.count);
 
    res.json({ nominations, staffCounts });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});
 
// Delete a nomination (admin only)
app.delete('/api/nominations/:id', adminAuth, async (req, res) => {
  try {
    await Nomination.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ─── SETTINGS ─────────────────────────────────────────────────

// Get results visibility (public)
app.get('/api/settings/results-visible', async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: 'results_visible' });
    res.json({ visible: setting ? setting.value : true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// Toggle results visibility (admin only)
app.post('/api/settings/results-visible', adminAuth, async (req, res) => {
  try {
    const { visible } = req.body;
    await Setting.findOneAndUpdate(
      { key: 'results_visible' },
      { value: visible },
      { upsert: true, new: true }
    );
    res.json({ success: true, visible });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ─── CONNECT & START ──────────────────────────────────────────
mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/university-voting")
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB error:", err);
    process.exit(1);
  });