const passwords = [
  { service: "Google", icon: "google", dots: "••••••••••••" },
  { service: "Facebook", icon: "facebook", dots: "••••••••••••" },
  { service: "Github", icon: "github", dots: "••••••••••••" },
];

function filterPasswords() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase();
  const items = document.querySelectorAll(".password-item");

  items.forEach((item) => {
    const serviceName = item
      .querySelector(".service-name")
      .textContent.toLowerCase();
    if (serviceName.includes(searchTerm)) {
      item.style.display = "flex";
    } else {
      item.style.display = "none";
    }
  });
}

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

function verify() {
  const code = document.getElementById("codeInput").value;

  if (code.length === 6 && /^\d+$/.test(code)) {
    alert("Код перевірено! Доступ надано.");
    document.getElementById("codeInput").value = "";
  } else {
    alert("Будь ласка, введіть 6-значний код");
  }
}

function cancel() {
  document.getElementById("codeInput").value = "";
  alert("Скасовано");
}

function showAddPassword() {
  alert("Функція додавання нового паролю буде реалізована");
}

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
