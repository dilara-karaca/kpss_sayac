const EXAM_TARGET_DATE = "2026-09-06T10:15:00+03:00";

const timeParts = {
  days: document.getElementById("days"),
  hours: document.getElementById("hours"),
  minutes: document.getElementById("minutes"),
  seconds: document.getElementById("seconds")
};

const examDateText = document.getElementById("examDateText");
const statusText = document.getElementById("statusText");
const themeToggle = document.getElementById("themeToggle");
const customizerToggle = document.getElementById("customizerToggle");
const customizerPanel = document.getElementById("customizerPanel");
const customizerClose = document.getElementById("customizerClose");
const customizerOverlay = document.getElementById("customizerOverlay");
const themeOptBtns = document.querySelectorAll(".theme-opt-btn");
const targetDate = new Date(EXAM_TARGET_DATE);
let previousValues = {};

function getInitialTheme() {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark" || savedTheme === "light") {
    return savedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeToggle.setAttribute("aria-label", theme === "dark" ? "Açık modu aç" : "Koyu modu aç");
}

function padNumber(value, length = 2) {
  return String(value).padStart(length, "0");
}

function formatExamDate(date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul"
  }).format(date);
}

function setValue(element, value, key) {
  if (previousValues[key] === value) {
    return;
  }

  element.classList.remove("is-changing");
  void element.offsetWidth;
  element.textContent = value;
  element.classList.add("is-changing");

  window.setTimeout(() => {
    element.classList.remove("is-changing");
  }, 160);

  previousValues[key] = value;
}

function updateCountdown() {
  const now = new Date();
  const difference = targetDate.getTime() - now.getTime();

  if (Number.isNaN(targetDate.getTime())) {
    statusText.textContent = "Hedef tarih geçerli değil.";
    return;
  }

  if (difference <= 0) {
    setValue(timeParts.days, "0", "days");
    setValue(timeParts.hours, "00", "hours");
    setValue(timeParts.minutes, "00", "minutes");
    setValue(timeParts.seconds, "00", "seconds");
    statusText.textContent = "KPSS Lisans sınav zamanı geldi.";
    return;
  }

  const totalSeconds = Math.floor(difference / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  setValue(timeParts.days, String(days), "days");
  setValue(timeParts.hours, padNumber(hours), "hours");
  setValue(timeParts.minutes, padNumber(minutes), "minutes");
  setValue(timeParts.seconds, padNumber(seconds), "seconds");

  statusText.textContent = "Sayaç her saniye otomatik güncellenir.";
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js");
  });
}

// Background customizer logic
function openCustomizer() {
  customizerPanel.setAttribute("aria-hidden", "false");
  customizerClose.focus();
  document.addEventListener("keydown", handleEscapeKey);
}

function closeCustomizer() {
  customizerPanel.setAttribute("aria-hidden", "true");
  customizerToggle.focus();
  document.removeEventListener("keydown", handleEscapeKey);
}

function handleEscapeKey(e) {
  if (e.key === "Escape") {
    closeCustomizer();
  }
}

function getInitialBgTheme() {
  const savedBg = localStorage.getItem("bg-theme");
  if (savedBg) return savedBg;
  return "default";
}

function applyBgTheme(themeId) {
  if (themeId === "default") {
    document.body.removeAttribute("data-bg-theme");
  } else {
    document.body.setAttribute("data-bg-theme", themeId);
  }
  
  themeOptBtns.forEach(btn => {
    if (btn.dataset.themeId === themeId) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

// Event Listeners for Customizer
customizerToggle.addEventListener("click", openCustomizer);
customizerClose.addEventListener("click", closeCustomizer);
customizerOverlay.addEventListener("click", closeCustomizer);

themeOptBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const themeId = btn.dataset.themeId;
    applyBgTheme(themeId);
    localStorage.setItem("bg-theme", themeId);
  });
});

// Initialize themes
applyTheme(getInitialTheme());
applyBgTheme(getInitialBgTheme());

themeToggle.addEventListener("click", () => {
  const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("theme", nextTheme);
  applyTheme(nextTheme);
});

examDateText.textContent = `Hedef sınav tarihi: ${formatExamDate(targetDate)}`;
updateCountdown();
window.setInterval(updateCountdown, 1000);
