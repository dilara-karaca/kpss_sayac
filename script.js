const EXAM_TARGET_DATE = "2026-09-06T10:15:00+03:00";

const timeParts = {
  days: document.getElementById("days"),
  hours: document.getElementById("hours"),
  minutes: document.getElementById("minutes"),
  seconds: document.getElementById("seconds")
};

const examDateText = document.getElementById("examDateText");
const statusText = document.getElementById("statusText");
const customizerToggle = document.getElementById("customizerToggle");
const customizerPanel = document.getElementById("customizerPanel");
const customizerClose = document.getElementById("customizerClose");
const customizerOverlay = document.getElementById("customizerOverlay");
const themeOptBtns = document.querySelectorAll(".theme-opt-btn");
const customThemeBtn = document.getElementById("customThemeBtn");
const customThemePreview = document.getElementById("customThemePreview");
const customBgInput = document.getElementById("customBgInput");
const targetDate = new Date(EXAM_TARGET_DATE);
let previousValues = {};
let customBgDataUrl = null;

const CUSTOM_BG_DB = "kpss-sayac-bg";
const CUSTOM_BG_STORE = "images";
const CUSTOM_BG_KEY = "custom";
const CUSTOM_BG_MAX_EDGE = 1920;
const CUSTOM_BG_JPEG_QUALITY = 0.82;



/* ─── Geri sayım ─────────────────────────────────────────────────────────── */

function padNumber(v, len = 2) {
  return String(v).padStart(len, "0");
}

function formatExamDate(date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul"
  }).format(date);
}

function setValue(el, value, key) {
  if (previousValues[key] === value) return;
  el.classList.remove("is-changing");
  void el.offsetWidth;
  el.textContent = value;
  el.classList.add("is-changing");
  setTimeout(() => el.classList.remove("is-changing"), 160);
  previousValues[key] = value;
}

function updateCountdown() {
  const diff = targetDate.getTime() - Date.now();
  if (isNaN(targetDate.getTime())) {
    statusText.textContent = "Hedef tarih geçerli değil.";
    return;
  }
  if (diff <= 0) {
    ["days", "hours", "minutes", "seconds"].forEach(k =>
      setValue(timeParts[k], k === "days" ? "0" : "00", k)
    );
    statusText.textContent = "KPSS Lisans sınav zamanı geldi.";
    return;
  }
  const tot = Math.floor(diff / 1000);
  setValue(timeParts.days, String(Math.floor(tot / 86400)), "days");
  setValue(timeParts.hours, padNumber(Math.floor((tot % 86400) / 3600)), "hours");
  setValue(timeParts.minutes, padNumber(Math.floor((tot % 3600) / 60)), "minutes");
  setValue(timeParts.seconds, padNumber(tot % 60), "seconds");
  statusText.textContent = "Sayaç her saniye otomatik güncellenir.";
}

examDateText.textContent = `Hedef sınav tarihi: ${formatExamDate(targetDate)}`;
updateCountdown();
setInterval(updateCountdown, 1000);

/* ─── Service Worker ─────────────────────────────────────────────────────── */

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js"));
}

/* ─── Canvas arka plan animasyonları ─────────────────────────────────────── */

const canvas = document.getElementById("bgCanvas");
const ctx = canvas.getContext("2d");
let animId = null;
let currentBgTheme = "default";

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", () => {
  resizeCanvas();
  // Aktif temaya göre partikülleri yeniden oluştur
  if (currentBgTheme === "starfield") initStarfield();
  if (currentBgTheme === "plexus") initPlexus();
});
resizeCanvas();

/* ── Canvas stilini sıfırla ─── */
function resetCanvas() {
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.style.display = "none";
}

/* ══════════════════════════════════════════════════════════════════════════
   YİLDIZLI UZAY — parıldayan yıldızlar
   ══════════════════════════════════════════════════════════════════════════ */

let stars = [];

function initStarfield() {
  const count = Math.floor((canvas.width * canvas.height) / 3000);
  stars = Array.from({ length: count }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.4 + 0.3,
    alpha: Math.random(),
    delta: (Math.random() * 0.008 + 0.003) * (Math.random() < 0.5 ? 1 : -1),
    color: Math.random() < 0.15
      ? `hsl(${220 + Math.random() * 40}, 80%, 90%)`
      : "#ffffff"
  }));
}

function drawStarfield() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const s of stars) {
    s.alpha += s.delta;
    if (s.alpha >= 1) { s.alpha = 1; s.delta = -Math.abs(s.delta); }
    if (s.alpha <= 0) { s.alpha = 0; s.delta = Math.abs(s.delta); }

    ctx.save();
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle = s.color;
    ctx.shadowColor = s.color;
    ctx.shadowBlur = s.r * 3;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  animId = requestAnimationFrame(drawStarfield);
}

function startStarfield() {
  canvas.style.display = "block";
  initStarfield();
  drawStarfield();
}

/* ══════════════════════════════════════════════════════════════════════════
   PLEXUS — hareketli noktalar ve yakınlaşınca bağlantı çizgileri
   ══════════════════════════════════════════════════════════════════════════ */

let nodes = [];
const NODE_COUNT = 80;
const MAX_DIST = 140;
const NODE_COLOR = "rgba(245,130,32,";   // turuncu
const LINE_BASE = "rgba(245,130,32,";

function initPlexus() {
  nodes = Array.from({ length: NODE_COUNT }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.6,
    vy: (Math.random() - 0.5) * 0.6,
    r: Math.random() * 1.8 + 1
  }));
}

function drawPlexus() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Noktaları güncelle ve sınır yansıması
  for (const n of nodes) {
    n.x += n.vx;
    n.y += n.vy;
    if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
    if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
  }

  // Bağlantı çizgileri
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MAX_DIST) {
        const alpha = (1 - dist / MAX_DIST) * 0.55;
        ctx.beginPath();
        ctx.strokeStyle = LINE_BASE + alpha + ")";
        ctx.lineWidth = 0.8;
        ctx.moveTo(nodes[i].x, nodes[i].y);
        ctx.lineTo(nodes[j].x, nodes[j].y);
        ctx.stroke();
      }
    }
  }

  // Noktalar
  for (const n of nodes) {
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.fillStyle = NODE_COLOR + "0.85)";
    ctx.shadowColor = NODE_COLOR + "0.6)";
    ctx.shadowBlur = 6;
    ctx.fill();
  }

  animId = requestAnimationFrame(drawPlexus);
}

function startPlexus() {
  canvas.style.display = "block";
  initPlexus();
  drawPlexus();
}

/* ─── Arka plan tema uygulama ────────────────────────────────────────────── */

function openCustomBgDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CUSTOM_BG_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CUSTOM_BG_STORE)) {
        db.createObjectStore(CUSTOM_BG_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveCustomBgImage(dataUrl) {
  const db = await openCustomBgDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(CUSTOM_BG_STORE, "readwrite");
    tx.objectStore(CUSTOM_BG_STORE).put(dataUrl, CUSTOM_BG_KEY);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

async function loadCustomBgImage() {
  try {
    const db = await openCustomBgDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(CUSTOM_BG_STORE, "readonly");
      const request = tx.objectStore(CUSTOM_BG_STORE).get(CUSTOM_BG_KEY);
      request.onsuccess = () => {
        db.close();
        resolve(request.result || null);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch {
    return null;
  }
}

function updateCustomThemePreview(dataUrl) {
  if (!customThemePreview) return;
  if (dataUrl) {
    customThemePreview.style.backgroundImage = `url("${dataUrl}")`;
    customThemePreview.classList.add("has-image");
  } else {
    customThemePreview.style.backgroundImage = "";
    customThemePreview.classList.remove("has-image");
  }
}

function setCustomBgCss(dataUrl) {
  if (dataUrl) {
    document.documentElement.style.setProperty("--custom-bg-image", `url("${dataUrl}")`);
  } else {
    document.documentElement.style.removeProperty("--custom-bg-image");
  }
}

function processImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("Geçersiz görsel dosyası."));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;
      const longest = Math.max(width, height);

      if (longest > CUSTOM_BG_MAX_EDGE) {
        const scale = CUSTOM_BG_MAX_EDGE / longest;
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }

      const offscreen = document.createElement("canvas");
      offscreen.width = width;
      offscreen.height = height;
      const offCtx = offscreen.getContext("2d");
      offCtx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(objectUrl);

      try {
        resolve(offscreen.toDataURL("image/jpeg", CUSTOM_BG_JPEG_QUALITY));
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Görsel yüklenemedi."));
    };

    img.src = objectUrl;
  });
}

function getInitialBgTheme() {
  return localStorage.getItem("bg-theme") || "default";
}

function applyBgTheme(themeId) {
  currentBgTheme = themeId;
  resetCanvas();

  if (themeId === "default") {
    document.body.removeAttribute("data-bg-theme");
  } else {
    document.body.setAttribute("data-bg-theme", themeId);
  }

  if (themeId === "custom") {
    setCustomBgCss(customBgDataUrl);
  } else {
    setCustomBgCss(null);
  }

  if (themeId === "starfield") startStarfield();
  if (themeId === "plexus") startPlexus();

  themeOptBtns.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.themeId === themeId);
  });
}

async function handleCustomBgFile(file) {
  const dataUrl = await processImageFile(file);
  customBgDataUrl = dataUrl;
  updateCustomThemePreview(dataUrl);
  await saveCustomBgImage(dataUrl);
  applyBgTheme("custom");
  localStorage.setItem("bg-theme", "custom");
}

/* ─── Customizer panel ───────────────────────────────────────────────────── */

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
  if (e.key === "Escape") closeCustomizer();
}

customizerToggle.addEventListener("click", openCustomizer);
customizerClose.addEventListener("click", closeCustomizer);
customizerOverlay.addEventListener("click", closeCustomizer);

themeOptBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    const id = btn.dataset.themeId;

    if (id === "custom") {
      if (customBgDataUrl && currentBgTheme !== "custom") {
        applyBgTheme("custom");
        localStorage.setItem("bg-theme", "custom");
        return;
      }
      customBgInput.click();
      return;
    }

    applyBgTheme(id);
    localStorage.setItem("bg-theme", id);
  });
});

customBgInput.addEventListener("change", async () => {
  const file = customBgInput.files && customBgInput.files[0];
  customBgInput.value = "";
  if (!file) return;

  try {
    await handleCustomBgFile(file);
  } catch {
    statusText.textContent = "Fotoğraf yüklenemedi. Lütfen başka bir görsel deneyin.";
  }
});

/* ─── İlk yükleme ────────────────────────────────────────────────────────── */
(async function initBgTheme() {
  customBgDataUrl = await loadCustomBgImage();
  updateCustomThemePreview(customBgDataUrl);

  const initialTheme = getInitialBgTheme();
  if (initialTheme === "custom" && !customBgDataUrl) {
    applyBgTheme("default");
    localStorage.setItem("bg-theme", "default");
    return;
  }

  applyBgTheme(initialTheme);
})();