//LIBRARIES//
const CryptoJS = require("crypto-js");
const cors = require("cors");
const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const path = require("path");
////
//Create app//
const app = express();

app.use(cors());

app.use(bodyParser.json({ limit: "50mb" }));

app.use(bodyParser.json({ limit: "50mb", extended: true }));

////
//API//

app.use(express.static(path.join(__dirname, "frontend")));

app.use("/img", express.static(path.join(__dirname, "img")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});
app.post("/encrypt", (req, res) => {
  const { data, key } = req.body;
  const encrypted = encrypt(data, key);
  res.json(encrypted);
});
app.post("/decrypt", (req, res) => {
  const { encryptedData, key } = req.body;
  const decryptData = decrypt(encryptedData, key);
  res.json(decryptData);
});

/////
//FUNCTION//

function encrypt(data, key) {
  const chipherText = CryptoJS.AES.encrypt(data, key).toString();
  return chipherText;
}
function decrypt(chipherText, key) {
  try {
    const bytes = CryptoJS.AES.decrypt(chipherText, key);

    if (bytes.sigBytes > 0) {
      const decryptData = bytes.toString(CryptoJS.enc.Utf8);
      return decryptData;
    } else {
      throw new Error("Invalid key");
    }
  } catch (error) {
    throw new Error("Invalid key");
  }
}
//

//EXPORT//
module.exports = app;
