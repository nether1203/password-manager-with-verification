require("dotenv").config();
console.log("MONGODB_URI:", process.env.MONGODB_URI ? "✅ OK" : "❌ ПОРОЖНІЙ");
console.log(
  "SENDGRID_API_KEY:",
  process.env.SENDGRID_API_KEY ? "✅ OK" : "❌ ПОРОЖНІЙ",
);
const CryptoJS = require("crypto-js");
const cors = require("cors");
const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const { MongoClient } = require("mongodb");

let client,
  db,
  useMemoryFallback = false;
const passwordsStore = {};
const otpStore = {};
const sessions = {};

async function connectDB() {
  try {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI відсутній");
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db("passwords");
    console.log("✅ MongoDB підключено");
    useMemoryFallback = false; // ✅ MongoDB OK
  } catch (error) {
    console.error("❌ MongoDB помилка:", error.message);
    useMemoryFallback = true; // ✅ Fallback
  }
}

// App
const app = express();

// Підключення БД
connectDB();

// Middleware
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

function setVerified(email) {
  sessions[email] = { verifiedUntil: Date.now() + 30 * 60 * 1000 };
}

function isVerified(email) {
  const s = sessions[email];
  return s && Date.now() < s.verifiedUntil;
}

function requireOtp(req, res, next) {
  const email = req.body.email;
  if (!email) return res.status(400).json({ error: "Потрібен email" });
  if (!isVerified(email))
    return res.status(401).json({ error: "Спочатку підтвердіть OTP" });
  next();
}

// API
app.use(express.static(path.join(__dirname, "frontend")));
app.use("/img", express.static(path.join(__dirname, "img")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

// Шифрування
app.post("/encrypt", (req, res) => {
  const { data, key } = req.body;
  const encrypted = encrypt(data, key);
  res.json({ encrypted });
});

app.post("/decrypt", (req, res) => {
  const { encryptedData, key } = req.body;
  try {
    const decrypted = decrypt(encryptedData, key);
    res.json({ decrypted });
  } catch (e) {
    res.status(400).json({ error: "Invalid key" });
  }
});

// ✅ ТЕСТОВИЙ OTP (SendGrid після верифікації)
app.post("/generate-otp", async (req, res) => {
  console.log("POST /generate-otp body =", req.body);
  const { email } = req.body;

  if (!email) return res.status(400).json({ error: "Email обов'язковий" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  console.log(`🔥 SendGrid OTP для ${email}: ${otp}`);

  otpStore[email] = { code: otp, expiresAt: Date.now() + 5 * 60 * 1000 };

  try {
    await sendOtpEmail(email, otp);
    res.json({ success: true, message: `Код відправлено на ${email}` });
  } catch (error) {
    console.error("SendGrid помилка:", error);
    res.json({ success: true, otp, message: `КОД: ${otp} (backup)` });
  }
});

app.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp)
    return res
      .status(400)
      .json({ success: false, error: "Email та OTP обов'язкові" });

  const record = otpStore[email];
  if (!record)
    return res.status(400).json({ success: false, error: "Немає коду" });
  if (Date.now() > record.expiresAt)
    return res.status(400).json({ success: false, error: "Код минув" });
  if (record.code !== otp)
    return res.status(400).json({ success: false, error: "Невірний код" });

  delete otpStore[email];
  setVerified(email);
  res.json({ success: true, message: "OTP підтверджено" });
});

// ✅ MongoDB паролі З ПЕРЕВІРКОЮ db
app.post("/passwords", requireOtp, async (req, res) => {
  if (!db) return res.status(500).json({ error: "База даних не готова" });

  const { email, service, login, password, key } = req.body;
  if (!service || !login || !password || !key)
    return res.status(400).json({ error: "Заповніть поля" });

  const passwordEncrypted = encrypt(password, key);
  const id = Date.now().toString();

  await db.collection("passwords").insertOne({
    email,
    id,
    service,
    login,
    passwordEncrypted,
    createdAt: new Date(),
  });
  res.json({ success: true, id });
});

app.post("/passwords/list", requireOtp, async (req, res) => {
  const { email } = req.body;
  let passwords;

  if (useMemoryFallback || !db) {
    passwords = passwordsStore[email] || [];
  } else {
    passwords = await db.collection("passwords").find({ email }).toArray();
  }

  // ✅ Зашифрований текст
  const list = passwords.map((p) => ({
    id: p.id,
    service: p.service,
    login: p.login,
    encrypted: (p.passwordEncrypted || "").substring(0, 20) + "...",
  }));

  res.json(list);
});

app.post("/passwords/decrypt", requireOtp, async (req, res) => {
  if (!db) return res.status(500).json({ error: "База даних не готова" });
  const { email, id, key } = req.body;
  const record = await db.collection("passwords").findOne({ email, id });
  if (!record) return res.status(404).json({ error: "Не знайдено" });

  try {
    const password = decrypt(record.passwordEncrypted, key);
    res.json({ password });
  } catch {
    res.status(400).json({ error: "Невірний ключ" });
  }
});

app.post("/passwords/delete", requireOtp, async (req, res) => {
  if (!db) return res.status(500).json({ error: "База даних не готова" });
  const { email, id } = req.body;
  await db.collection("passwords").deleteOne({ email, id });
  res.json({ success: true });
});

// Функції
function encrypt(data, key) {
  return CryptoJS.AES.encrypt(data, key).toString();
}

function decrypt(cipherText, key) {
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, key);
    if (bytes.sigBytes > 0) return bytes.toString(CryptoJS.enc.Utf8);
    throw new Error("Invalid key");
  } catch {
    throw new Error("Invalid key");
  }
}

function sendOtpEmail(email, otp) {
  const msg = {
    to: email,
    from: process.env.EMAIL_USER,
    subject: "🔐 Ваш код верифікації",
    html: `
      <div style="font-family: Arial; padding: 20px; background: #f5f5f5;">
        <div style="background: white; max-width: 500px; margin: 0 auto; padding: 30px; border-radius: 10px;">
          <h2 style="color:#208084;">Ваш код верифікації</h2>
          <div style="border:2px solid #208084; padding:20px; text-align:center; border-radius:8px;">
            <span style="font-size:32px; letter-spacing:4px; color:#208084;">${otp}</span>
          </div>
          <p>Код дійсний 5 хвилин.</p>
        </div>
      </div>
    `,
  };
  return sgMail.send(msg);
}

// Порт
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

module.exports = app;
