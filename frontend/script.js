let currentEmail = "";
let allPasswords = [];

function showStep(stepId) {
  document.querySelectorAll(".step").forEach((s) => {
    s.style.display = "none";
  });
  document.getElementById(stepId).style.display = "block";
  if (stepId === "step3")
    document.getElementById("pageTitle").textContent = "🔑 Ваші паролі";
  if (stepId === "step1")
    document.getElementById("pageTitle").textContent = "🔐 Введіть email";
}

// 👉 СТАРТ - показати email форму
showStep("step1");

function generateOtp() {
  const email = document.getElementById("emailInput").value;
  if (!email) return alert("Введіть email!");

  fetch("/generate-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        currentEmail = email;
        document.getElementById("emailDisplay").textContent = email;
        showStep("step2");
      } else alert(data.error || "Помилка");
    })
    .catch((err) => alert("Сервер не відповідає"));
}

function verifyOtp() {
  const otp = document.getElementById("otpInput").value;
  if (otp.length !== 6) return alert("Введіть 6 цифр!");

  fetch("/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: currentEmail, otp }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        loadPasswords();
        showStep("step3");
      } else alert(data.error || "Невірний код");
    });
}

function loadPasswords() {
  fetch("/passwords/list", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: currentEmail }),
  })
    .then((res) => res.json())
    .then((passwords) => {
      allPasswords = passwords;
      renderPasswords(passwords);
    })
    .catch(() => {
      document.getElementById("passwordList").innerHTML =
        '<div class="password-item"><div class="service-name">Помилка завантаження</div></div>';
    });
}

function renderPasswords(passwords) {
  const list = document.getElementById("passwordList");
  if (!passwords || passwords.length === 0) {
    list.innerHTML =
      '<div class="password-item"><div class="service-name">Немає паролів</div></div>';
    return;
  }
  list.innerHTML = passwords
    .map(
      (p) => `
    <div class="password-item" style="align-items: center; gap: 10px;">
      <div class="icon" style="background: linear-gradient(135deg, #${Math.floor(
        Math.random() * 16777215
      ).toString(16)}, #${Math.floor(Math.random() * 16777215).toString(16)})">
        ${p.service[0]?.toUpperCase() || "?"}
      </div>
      <div class="password-info" style="flex: 1;">
        <div class="service-name">${p.service}</div>
        <div class="password-dots">${
          p.login
        } <span class="encrypted">[ЗАШИФРОВАНО]</span></div>
      </div>
      <input type="text" class="key-input" id="key-${p.id}" placeholder="Ключ">
      <button onclick="decryptPassword('${
        p.id
      }')" style="padding: 8px 12px;">🔓</button>
      <button onclick="deletePassword('${
        p.id
      }')" style="padding: 8px 12px;">🗑️</button>
    </div>
  `
    )
    .join("");
}

function filterPasswords() {
  const search =
    document.getElementById("searchInput")?.value.toLowerCase() || "";
  const filtered = allPasswords.filter(
    (p) =>
      p.service.toLowerCase().includes(search) ||
      p.login.toLowerCase().includes(search)
  );
  renderPasswords(filtered);
}

function decryptPassword(id) {
  const key = document.getElementById(`key-${id}`)?.value;
  if (!key) return alert("Введіть ключ!");
  fetch("/passwords/decrypt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: currentEmail, id, key }),
  })
    .then((res) => res.json())
    .then((data) =>
      data.password
        ? (document.querySelector(
            `#key-${id}`
          ).nextElementSibling.nextElementSibling.textContent = `Пароль: ${data.password}`)
        : alert(data.error || "Помилка")
    );
}

function savePassword() {
  const service = document.getElementById("service").value;
  const login = document.getElementById("login").value;
  const password = document.getElementById("password").value;
  const key = document.getElementById("key").value;
  if (!service || !login || !password || !key)
    return alert("Заповніть всі поля!");

  fetch("/passwords", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: currentEmail,
      service,
      login,
      password,
      key,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        loadPasswords();
        showStep("step3");
        document.getElementById("service").value = "";
        document.getElementById("login").value = "";
        document.getElementById("password").value = "";
        document.getElementById("key").value = "";
      }
    });
}

function deletePassword(id) {
  fetch("/passwords/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: currentEmail, id }),
  }).then(() => loadPasswords());
}

// Навігація
function showAddPassword() {
  showStep("step4");
}
function backToPasswords() {
  showStep("step3");
}
function backToLogin() {
  currentEmail = "";
  showStep("step1");
  document.getElementById("emailInput").value = "";
}

// Заглушки
function toggleTheme() {
  document.body.classList.toggle("dark-theme");
}
function validateCode() {}
function resendOtp() {
  generateOtp();
}
