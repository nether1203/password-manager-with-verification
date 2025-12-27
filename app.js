// LIBRARIES //
const CryptoJS = require("crypto-js");
const cors = require("cors");
const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const path = require("path");
require("dotenv").config();
console.log("EMAIL_USER =", process.env.EMAIL_USER);
console.log("EMAIL_PASSWORD =", process.env.EMAIL_PASSWORD);

// Create app //
const app = express();

// 1) Парсимо JSON ТА urlencoded
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true }));

// 2) CORS
app.use(cors());

// NODEMAILER //
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // ваша службова пошта
    pass: process.env.EMAIL_PASSWORD, // пароль додатку
  },
});

// OTP в пам'яті
const otpStore = {};

// СЕСІЇ OTP ПО EMAIL (доступ після перевірки коду)
const sessions = {}; // { email: { verifiedUntil } }

function setVerified(email) {
  sessions[email] = {
    verifiedUntil: Date.now() + 30 * 60 * 1000, // 30 хвилин
  };
}

function isVerified(email) {
  const s = sessions[email];
  if (!s) return false;
  return Date.now() < s.verifiedUntil;
}

function requireOtp(req, res, next) {
  const email = req.body.email;
  if (!email) {
    return res.status(400).json({ error: "Потрібен email" });
  }
  if (!isVerified(email)) {
    return res
      .status(401)
      .json({ error: "Спочатку підтвердіть OTP для цього email" });
  }
  next();
}

// API //
// статичні файли
app.use(express.static(path.join(__dirname, "frontend")));
app.use("/img", express.static(path.join(__dirname, "img")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});

// ШИФРУВАННЯ
app.post("/encrypt", (req, res) => {
  console.log("POST /encrypt body =", req.body);
  const { data, key } = req.body;
  const encrypted = encrypt(data, key);
  res.json({ encrypted });
});

// РОЗШИФРУВАННЯ
app.post("/decrypt", (req, res) => {
  console.log("POST /decrypt body =", req.body);
  const { encryptedData, key } = req.body;
  try {
    const decrypted = decrypt(encryptedData, key);
    res.json({ decrypted });
  } catch (e) {
    res.status(400).json({ error: "Invalid key" });
  }
});

// OTP – генерація
app.post("/generate-otp", (req, res) => {
  console.log("POST /generate-otp body =", req.body);
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email обов'язковий" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email] = {
    code: otp,
    expiresAt: Date.now() + 5 * 60 * 1000,
  };

  sendOtpEmail(email, otp)
    .then(() =>
      res.json({ success: true, message: `Код відправлено на ${email}` })
    )
    .catch((error) => {
      console.error("Помилка відправки OTP:", error);
      res.status(500).json({ error: "Не вдалося відправити код" });
    });
});

// OTP – перевірка
app.post("/verify-otp", (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res
      .status(400)
      .json({ success: false, error: "Email та OTP обов'язкові" });
  }

  const record = otpStore[email];
  if (!record) {
    return res.status(400).json({
      success: false,
      error: "Немає згенерованого коду для цього email",
    });
  }

  if (Date.now() > record.expiresAt) {
    return res.status(400).json({ success: false, error: "Код минув" });
  }

  if (record.code !== otp) {
    return res.status(400).json({ success: false, error: "Невірний код" });
  }

  delete otpStore[email];
  setVerified(email); // даємо доступ на 30 хв для цього email

  return res.json({ success: true, message: "OTP підтверджено" });
});

// ТУТ далі можна додати маршрути для паролів з requireOtp,
// коли будеш готовий з MongoDB або з масивом в пам'яті.

// FUNCTIONS //
function encrypt(data, key) {
  const cipherText = CryptoJS.AES.encrypt(data, key).toString();
  return cipherText;
}

function decrypt(cipherText, key) {
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, key);
    if (bytes.sigBytes > 0) {
      const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
      return decryptedData;
    } else {
      throw new Error("Invalid key");
    }
  } catch (error) {
    throw new Error("Invalid key");
  }
}

function sendOtpEmail(email, otp) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "🔐 Ваш код верифікації",
    html: `
      <div style="font-family: Arial; padding: 20px; background: #f5f5f5;">
        <div style="background: white; max-width: 500px; margin: 0 auto; padding: 30px; border-radius: 10px;">
          <h2 style="color:#208084;">Ваш код верифікації</h2>
          <div style="border:2px solid #208084; padding:20px; text-align:center; border-radius:8px;">
            <span style="font-size:32px; letter-spacing:4px; color:#208084;">${otp}</span>
          </div>
          <p>Код дійсний 5 хвилин. Не передавайте його нікому.</p>
        </div>
      </div>
    `,
  };
  return transporter.sendMail(mailOptions);
}

// EXPORT //
module.exports = app;
