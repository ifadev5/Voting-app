require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const fs = require("fs");

const Candidate = require("./models/Candidate");
const Submission = require("./models/Submission");
const Category = require("./models/Category");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "uploads")),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

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

// Simple admin middleware
function adminAuth(req, res, next) {
  const token = req.headers["x-admin-token"];
  if (token === "admin-token-secret") return next();
  res.status(403).json({ message: "Unauthorized" });
}

// ─── ROOT ─────────────────────────────────────────────────────
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

app.post(
  "/api/candidates",
  adminAuth,
  upload.single("image"),
  async (req, res) => {
    try {
      const { name, category } = req.body;
      const image = req.file
        ? `/uploads/${req.file.filename}`
        : req.body.image || "";
      const candidate = new Candidate({ name, category, image });
      await candidate.save();
      res.status(201).json(candidate);
    } catch (e) {
      res.status(400).json({ message: e.message });
    }
  },
);

app.delete("/api/candidates/:id", adminAuth, async (req, res) => {
  try {
    const c = await Candidate.findByIdAndDelete(req.params.id);
    if (c && c.image && c.image.startsWith("/uploads/")) {
      const filePath = path.join(__dirname, c.image);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ─── SUBMISSIONS ───────────────────────────────────────────────
app.post("/api/submit-vote", async (req, res) => {
  try {
    const {
      fullName,
      candidateId,
      candidateName,
      category,
      amountPaid,
      transactionRef,
    } = req.body;
    if (!fullName || !candidateId || !amountPaid || !transactionRef) {
      return res.status(400).json({ message: "All fields are required." });
    }
    const amount = parseFloat(amountPaid);
    if (isNaN(amount) || amount < 200) {
      return res.status(400).json({ message: "Minimum amount is ₦200." });
    }
    const votes = Math.floor(amount / 200);
    const submission = new Submission({
      fullName,
      candidateId,
      candidateName,
      category,
      amountPaid: amount,
      votes,
      transactionRef,
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

    // Add votes to candidate
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
      { new: true },
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

// ─── CONNECT & START ──────────────────────────────────────────
mongoose
  .connect(
    process.env.MONGO_URI || "mongodb://localhost:27017/university-voting",
  )
  .then(() => {
    console.log("✅ MongoDB connected");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB error:", err);
    process.exit(1);
  });
