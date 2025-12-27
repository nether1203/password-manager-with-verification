function filterPasswords() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  const items = document.querySelectorAll(".password-item");
}

// поточний email користувача
let currentEmail = null;

// ТЕСТ OTP – запит коду на пошту
function testOtp() {
  const email = prompt("Введіть email для OTP:");

  if (!email) {
    alert("Email обовʼязковий");
    return;
  }

  currentEmail = email;

  fetch("/generate-otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("OTP response:", data);
      alert(data.message || "Код відправлено на email");
    })
    .catch((err) => {
      console.error(err);
      alert("Помилка надсилання OTP");
    });
}

// Валідація поля коду (твоя функція, якщо була – можна залишити)
function validateCode() {
  const code = document.getElementById("codeInput").value;
  const verifyBtn = document.getElementById("verifyBtn");

  if (code.length === 6 && /^\d+$/.test(code)) {
    verifyBtn.style.opacity = "1";
    verifyBtn.style.cursor = "pointer";
  } else {
    verifyBtn.style.opacity = "0.7";
    verifyBtn.style.cursor = "not-allowed";
  }
}

// VERIFY – відправка коду на бекенд
function verify() {
  const code = document.getElementById("codeInput").value;

  if (!currentEmail) {
    alert("Спочатку натисніть 'Тест OTP' і введіть email");
    return;
  }

  if (!(code.length === 6 && /^\d+$/.test(code))) {
    alert("Будь ласка, введіть 6-значний код");
    return;
  }

  fetch("/verify-otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email: currentEmail, otp: code }),
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("Verify response:", data);
      if (data.success) {
        alert("Код підтверджено! Тепер можна працювати з паролями.");
        document.getElementById("codeInput").value = "";
        // тут пізніше викличеш loadPasswords() коли зробимо збереження паролів
      } else {
        alert(data.error || "Невірний код");
      }
    })
    .catch((err) => {
      console.error(err);
      alert("Помилка перевірки, дивись консоль");
    });
}

// Cancel – просто очищення поля
function cancel() {
  document.getElementById("codeInput").value = "";
  alert("Скасовано");
}

// Далі залишаєш свої вже існуючі функції:
// filterPasswords, showAddPassword, toggleTheme, window.addEventListener("DOMContentLoaded"...)

function toggleTheme() {
  document.body.classList.toggle("dark-theme");
  const isDark = document.body.classList.contains("dark-theme");
  localStorage.setItem("theme", isDark ? "dark" : "light");

  const themeBtn = document.getElementById("themeBtn");
  themeBtn.innerHTML = isDark
    ? '<svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>'
    : '<svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>';
}

window.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-theme");
    const themeBtn = document.getElementById("themeBtn");
    themeBtn.innerHTML =
      '<svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>';
  }
});
