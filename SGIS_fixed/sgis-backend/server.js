const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");

const app = express();

/* ================= MIDDLEWARE ================= */
app.use(cors());
app.use(express.json());

/* ================= SERVE FRONTEND ================= */
app.use(express.static(path.join(__dirname, "../")));

/* ================= DB ================= */
mongoose.connect("mongodb://127.0.0.1:27017/sgis")
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => { console.error("❌ MongoDB Error:", err); process.exit(1); });

/* ================= MODELS ================= */
const ComplaintSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, required: true },
  category:    { type: String, required: true },
  priority:    { type: String, default: "Medium" },
  status:      { type: String, default: "Submitted" },
  submittedBy: { type: String, default: "" },
  officerName: { type: String, default: "" },
  department:  { type: String, default: "" },
  createdAt:   { type: Date, default: Date.now }
});

const UserSchema = new mongoose.Schema({
  name:      { type: String, required: true },
  email:     { type: String, required: true, unique: true },
  password:  { type: String, required: true },
  phone:     { type: String, default: "" },
  address:   { type: String, default: "" },
  role:      { type: String, default: "USER" },
  createdAt: { type: Date, default: Date.now }
});

const Complaint = mongoose.models.Complaint || mongoose.model("Complaint", ComplaintSchema);
const User      = mongoose.models.User      || mongoose.model("User",      UserSchema);

/* ================= ROUTES ================= */

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../login.html"));
});

/* ---- SETUP ADMIN (run once) ---- */
app.get("/api/setup-admin", async (req, res) => {
  const exists = await User.findOne({ role: "ADMIN" });
  if (exists) return res.json({ ok: true, message: "Admin already exists. Login: admin@sgis.com / admin123" });
  const admin = new User({ name: "Admin", email: "admin@sgis.com", password: "admin123", role: "ADMIN" });
  await admin.save();
  res.json({ ok: true, message: "Admin created! Email: admin@sgis.com | Password: admin123" });
});

/* ---- REGISTER ---- */
app.post("/api/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.json({ ok: false, message: "All fields required" });
    const exists = await User.findOne({ email });
    if (exists) return res.json({ ok: false, message: "Email already registered" });
    await new User({ name, email, password }).save();
    return res.json({ ok: true });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

/* ---- LOGIN ---- */
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.json({ ok: false, message: "Missing credentials" });
    const user = await User.findOne({ email });
    if (!user) return res.json({ ok: false, message: "User not found" });
    if (user.password !== password) return res.json({ ok: false, message: "Wrong password" });
    return res.json({ ok: true, data: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({ ok: false, message: "Server error" });
  }
});

/* ---- PROFILE GET ---- */
app.get("/api/profile", async (req, res) => {
  try {
    const email = req.headers["x-user-email"];
    if (!email) return res.json({ ok: false, message: "Not logged in" });
    const user = await User.findOne({ email }).select("-password");
    if (!user) return res.json({ ok: false, message: "User not found" });
    res.json({ ok: true, data: user });
  } catch (err) { res.status(500).json({ ok: false }); }
});

/* ---- PROFILE UPDATE ---- */
app.put("/api/profile", async (req, res) => {
  try {
    const email = req.headers["x-user-email"];
    if (!email) return res.json({ ok: false, message: "Not logged in" });
    const { name, phone, address } = req.body;
    await User.findOneAndUpdate({ email }, { name, phone, address });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ ok: false }); }
});

/* ---- CHANGE PASSWORD ---- */
app.put("/api/change-password", async (req, res) => {
  try {
    const email = req.headers["x-user-email"];
    if (!email) return res.json({ ok: false, message: "Not logged in" });
    const { oldPassword, newPassword } = req.body;
    const user = await User.findOne({ email });
    if (!user || user.password !== oldPassword) return res.json({ ok: false, message: "Current password is wrong" });
    user.password = newPassword;
    await user.save();
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ ok: false }); }
});

/* ---- SUBMIT COMPLAINT ---- */
app.post("/api/complaints", async (req, res) => {
  try {
    const email = req.headers["x-user-email"];
    const { title, category, description, priority } = req.body;
    if (!title || !category || !description) return res.json({ ok: false, message: "All fields required" });
    await new Complaint({ title, category, description, priority: priority || "Medium", submittedBy: email || "unknown" }).save();
    res.json({ ok: true, message: "Complaint submitted" });
  } catch (err) {
    console.error("SUBMIT ERROR:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

/* ---- MY COMPLAINTS ---- */
app.get("/api/my-complaints", async (req, res) => {
  try {
    const email = req.headers["x-user-email"];
    if (!email) return res.json({ ok: true, data: [] });
    const data = await Complaint.find({ submittedBy: email }).sort({ createdAt: -1 });
    res.json({ ok: true, data });
  } catch (err) { res.status(500).json({ ok: false, data: [] }); }
});

/* ---- ADMIN: ALL COMPLAINTS ---- */
app.get("/api/admin/complaints", async (req, res) => {
  try {
    const data = await Complaint.find().sort({ createdAt: -1 });
    res.json({ ok: true, data });
  } catch (err) { res.status(500).json({ ok: false, data: [] }); }
});

/* ---- ADMIN: UPDATE STATUS ---- */
app.put("/api/admin/complaints/:id/status", async (req, res) => {
  try {
    await Complaint.findByIdAndUpdate(req.params.id, { status: req.body.status });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ ok: false }); }
});

/* ---- ADMIN: ASSIGN OFFICER ---- */
app.post("/api/admin/assign-officer", async (req, res) => {
  try {
    const { complaintId, officerName, department } = req.body;
    const c = await Complaint.findById(complaintId);
    if (!c) return res.json({ ok: false, message: "Complaint not found" });
    c.officerName = officerName;
    c.department  = department;
    c.status      = "Assigned";
    await c.save();
    res.json({ ok: true });
  } catch (err) {
    console.error("ASSIGN ERROR:", err);
    res.status(500).json({ ok: false });
  }
});

/* ---- ADMIN: STATS (dashboard) ---- */
app.get("/api/admin/stats", async (req, res) => {
  try {
    const all = await Complaint.find();
    const monthly = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end   = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      monthly.push({
        month: start.toLocaleString("default", { month: "short" }),
        count: all.filter(c => c.createdAt >= start && c.createdAt < end).length
      });
    }
    res.json({ ok: true, data: {
      total:      all.length,
      submitted:  all.filter(c => c.status === "Submitted").length,
      assigned:   all.filter(c => c.status === "Assigned").length,
      inProgress: all.filter(c => c.status === "In Progress").length,
      resolved:   all.filter(c => c.status === "Resolved").length,
      monthly
    }});
  } catch (err) { res.status(500).json({ ok: false }); }
});

/* ---- ADMIN: REPORTS ---- */
app.get("/api/admin/reports", async (req, res) => {
  try {
    const all = await Complaint.find();
    const monthlyMap = {};
    all.forEach(c => {
      const month = new Date(c.createdAt).toLocaleString("default", { month: "short" });
      monthlyMap[month] = (monthlyMap[month] || 0) + 1;
    });
    res.json({ ok: true, data: {
      total:      all.length,
      submitted:  all.filter(c => c.status === "Submitted").length,
      inProgress: all.filter(c => c.status === "Assigned" || c.status === "In Progress").length,
      resolved:   all.filter(c => c.status === "Resolved").length,
      monthly:    monthlyMap
    }});
  } catch (err) { res.status(500).json({ ok: false }); }
});

/* ---- ADMIN: ALL USERS ---- */
app.get("/api/admin/users", async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json({ ok: true, data: users });
  } catch (err) { res.status(500).json({ ok: false, data: [] }); }
});

/* ---- ADMIN: DELETE USER ---- */
app.delete("/api/admin/users/:id", async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ ok: false }); }
});

/* ================= START ================= */
app.listen(8080, () => {
  console.log("🚀 Server running on http://localhost:8080");
  console.log("📌 First time? Visit: http://localhost:8080/api/setup-admin");
});
