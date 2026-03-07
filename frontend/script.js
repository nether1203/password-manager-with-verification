let currentEmail = "";
let allPasswords = [];

// Показ кроків
function showStep(stepId) {
  document.querySelectorAll(".step").forEach((s) => (s.style.display = "none"));
  const step = document.getElementById(stepId);
  if (step) step.style.display = "block";
}

// Старт з кроку 1 (email)
showStep("step1");

// Генерація OTP
function generateOtp() {
  const emailInput = document.getElementById("emailInput");
  if (!emailInput) return alert("Поле email не знайдено");
  const email = emailInput.value.trim();
  if (!email) return alert("Введіть email");

  fetch("/generate-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })
    .then((r) => r.json())
    .then((data) => {
      if (!data.success) return alert(data.error || "Помилка OTP");
      currentEmail = email;
      const emailDisplay = document.getElementById("emailDisplay");
      if (emailDisplay) emailDisplay.textContent = email;

      // якщо бек у тестовому режимі – показати код
      if (data.otp) {
        alert(`Код: ${data.otp}`);
        const otpInput = document.getElementById("otpInput");
        if (otpInput) otpInput.value = data.otp;
      }

      showStep("step2");
    })
    .catch(() => alert("Помилка зʼєднання з сервером"));
}  

// Перевірка OTP
function verifyOtp() {
  const otpInput = document.getElementById("otpInput");
  if (!otpInput) return alert("Поле коду не знайдено");
  const otp = otpInput.value.trim();
  if (otp.length !== 6) return alert("Введіть 6 цифр");

  fetch("/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: currentEmail, otp }),
  })
    .then((r) => r.json())
    .then((data) => {
      if (!data.success) return alert(data.error || "Невірний код");
      loadPasswords();
      showStep("step3");
    });
}

// Завантаження паролів
function loadPasswords() {
  fetch("/passwords/list", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: currentEmail }),
  })
    .then((r) => r.json())
    .then((passwords) => {
      allPasswords = passwords;
      renderPasswords(passwords);
    });
}

// Рендер списку
function renderPasswords(passwords) {
  const list = document.getElementById("passwordList");
  if (!list) return;

  if (!passwords || passwords.length === 0) {
    list.innerHTML =
      '<div class="password-item"><div class="service-name">Немає паролів</div></div>';
    return;
  }

  list.innerHTML = passwords
    .map(
      (p) => `
    <div class="password-item">
      <div class="icon" style="background: linear-gradient(135deg, #${Math.floor(
        Math.random() * 16777215,
      ).toString(16)}, #${Math.floor(Math.random() * 16777215).toString(16)})">
        ${p.service[0]?.toUpperCase() || "?"}
      </div>
      <div class="password-info">
        <div class="service-name">${p.service}</div>
        <div class="password-dots">${p.login}</div>
        <div class="encrypted">${
          p.encrypted || "U2FsdGVkX1...🔒"
        }</div> <!-- ЗАШИФРОВАНИЙ ТЕКСТ -->
      </div>
      <input type="password" class="key-input" id="key-${
        p.id
      }" placeholder="Ключ розшифровки">
      <button class="decrypt-btn" onclick="decryptPassword('${
        p.id
      }')" style="margin-left: 8px;">🔓 Розшифрувати</button>
      <button class="delete-btn" onclick="deletePassword('${p.id}')">🗑️</button>
    </div>
  `,
    )
    .join("");
}

// Фільтр
function filterPasswords() {
  const q = document.getElementById("searchInput")?.value.toLowerCase() || "";
  const filtered = allPasswords.filter(
    (p) =>
      p.service.toLowerCase().includes(q) || p.login.toLowerCase().includes(q),
  );
  renderPasswords(filtered);
}

// Додавання пароля
function savePassword() {
  const service = document.getElementById("service").value.trim();
  const login = document.getElementById("login").value.trim();
  const password = document.getElementById("password").value.trim();
  const key = document.getElementById("key").value.trim();

  if (!service || !login || !password || !key)
    return alert("Заповніть всі поля");

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
    .then((r) => r.json())
    .then((data) => {
      if (!data.success) return alert(data.error || "Помилка збереження");
      loadPasswords();
      showStep("step3");
    });
}

// Розшифровка
function decryptPassword(id) {
  const input = document.getElementById(`key-${id}`);
  if (!input) return;
  const key = input.value.trim();
  if (!key) return alert("Введіть ключ");

  fetch("/passwords/decrypt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: currentEmail, id, key }),
  })
    .then((r) => r.json())
    .then((data) => {
      if (!data.password) return alert(data.error || "Помилка розшифровки");
      const item = input.closest(".password-item");
      const span = item.querySelector(".encrypted");
      if (span)
        span.outerHTML = `<span class="decrypted">Пароль: ${data.password}</span>`;
    });
}

// Видалення
function deletePassword(id) {
  fetch("/passwords/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: currentEmail, id }),
  }).then(() => loadPasswords());
}

// Допоміжні
function backToLogin() {
  currentEmail = "";
  showStep("step1");
}
function backToPasswords() {
  showStep("step3");
}
function showAddPassword() {
  showStep("step4");
}
function resendOtp() {
  generateOtp();
}
function validateCode() {
  const otpInput = document.getElementById("otpInput");
  if (otpInput) otpInput.value = otpInput.value.replace(/[^0-9]/g, "");
}
function toggleTheme() {
  document.body.classList.toggle("dark-theme");
}
function checkStrength() {
  const password = document.getElementById("password").value;
  const bar = document.getElementById("strength-bar");
  const text = document.getElementById("strength-text");

  let score = 0;

  if (!password) {
    bar.style.width = "0%";
    text.innerHTML = "";
    return;
  }

  // 1. Довжина більше 8
  if (password.length > 8) score++;
  // 2. Є цифри
  if (/\d/.test(password)) score++;
  // 3. Є малі літери
  if (/[a-z]/.test(password)) score++;
  // 4. Є великі літери
  if (/[A-Z]/.test(password)) score++;
  // 5. Є спецсимволи (!@#$%)
  if (/[^A-Za-z0-9]/.test(password)) score++;

  // Відображення (максимум 5 балів)
  const percent = Math.min((score / 5) * 100, 100);
  bar.style.width = percent + "%";

  // Очищаємо класи кольорів
  bar.className = "";

  if (score <= 2) {
    bar.classList.add("weak");
    text.innerText = "Слабкий 😟";
    text.style.color = "#ef4444";
  } else if (score <= 4) {
    bar.classList.add("medium");
    text.innerText = "Середній 😐";
    text.style.color = "#eab308";
  } else {
    bar.classList.add("strong");
    text.innerText = "Надійний! 🚀";
    text.style.color = "#22c55e";
  }
}
function togglePassword() {
  const passwordInput = document.getElementById("password");
  const btn = document.querySelector(".toggle-btn");

  if (passwordInput.type === "password") {
    passwordInput.type = "text"; // Показуємо пароль
    btn.innerText = "🔒"; // Змінюємо іконку на замок (або перекреслене око)
  } else {
    passwordInput.type = "password"; // Ховаємо пароль
    btn.innerText = "👁️"; // Повертаємо око
  }
}
