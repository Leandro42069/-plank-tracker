const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "plank_entries_v1";
const REMINDER_KEY = "plank_reminder_time_v1";

let entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
let startTime = null;
let elapsed = 0;
let ticker = null;
let reminderTimeout = null;

const timerDisplay = $("timerDisplay");
const startBtn = $("startBtn");
const stopBtn = $("stopBtn");
const resetBtn = $("resetBtn");
const entriesList = $("entriesList");
const todayStatus = $("todayStatus");
const streakDays = $("streakDays");
const reminderTime = $("reminderTime");
const reminderStatus = $("reminderStatus");

reminderTime.value = localStorage.getItem(REMINDER_KEY) || "20:00";

function formatMs(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  const tenth = Math.floor((ms % 1000) / 100);
  return `${minutes}:${seconds}.${tenth}`;
}

function formatDate(iso) {
  return new Intl.DateTimeFormat("de-CH", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function getDayKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function calculateStreak() {
  const days = new Set(entries.map(e => getDayKey(e.createdAt)));
  let count = 0;
  const cursor = new Date();
  while (days.has(cursor.toISOString().slice(0, 10))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

function render() {
  entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  entriesList.innerHTML = "";
  if (!entries.length) {
    entriesList.innerHTML = `<li class="muted">Noch keine Einträge.</li>`;
  } else {
    for (const entry of entries) {
      const li = document.createElement("li");
      li.className = "entry";
      li.innerHTML = `<div><strong>${formatMs(entry.durationMs)}</strong><br><span>${formatDate(entry.createdAt)}</span></div>`;
      const del = document.createElement("button");
      del.className = "danger ghost";
      del.textContent = "Löschen";
      del.onclick = () => {
        entries = entries.filter(e => e.id !== entry.id);
        save(); render();
      };
      li.appendChild(del);
      entriesList.appendChild(li);
    }
  }
  const today = new Date().toISOString().slice(0, 10);
  const todays = entries.filter(e => e.createdAt.slice(0, 10) === today);
  todayStatus.textContent = todays.length
    ? `Heute erledigt: ${todays.length} Eintrag${todays.length > 1 ? "e" : ""}. Beste Zeit: ${formatMs(Math.max(...todays.map(e => e.durationMs)))}`
    : "Heute noch keine Plank eingetragen.";
  streakDays.textContent = calculateStreak();
}

function tick() {
  timerDisplay.textContent = formatMs(elapsed + (Date.now() - startTime));
}

startBtn.onclick = () => {
  startTime = Date.now();
  ticker = setInterval(tick, 100);
  startBtn.disabled = true;
  stopBtn.disabled = false;
};

stopBtn.onclick = () => {
  if (!startTime) return;
  elapsed += Date.now() - startTime;
  clearInterval(ticker);
  entries.unshift({ id: crypto.randomUUID(), durationMs: elapsed, createdAt: new Date().toISOString() });
  save();
  startTime = null;
  elapsed = 0;
  timerDisplay.textContent = formatMs(0);
  startBtn.disabled = false;
  stopBtn.disabled = true;
  render();
};

resetBtn.onclick = () => {
  clearInterval(ticker);
  startTime = null;
  elapsed = 0;
  timerDisplay.textContent = formatMs(0);
  startBtn.disabled = false;
  stopBtn.disabled = true;
};

$("clearAllBtn").onclick = () => {
  if (confirm("Alle Plank-Einträge löschen?")) {
    entries = [];
    save(); render();
  }
};

function scheduleReminder() {
  clearTimeout(reminderTimeout);
  const [h, m] = reminderTime.value.split(":").map(Number);
  const next = new Date();
  next.setHours(h, m, 0, 0);
  if (next <= new Date()) next.setDate(next.getDate() + 1);
  const delay = next - new Date();
  reminderTimeout = setTimeout(() => {
    showReminder();
    scheduleReminder();
  }, delay);
  reminderStatus.textContent = `Nächste Erinnerung: ${new Intl.DateTimeFormat("de-CH", { dateStyle: "medium", timeStyle: "short" }).format(next)}`;
}

function showReminder() {
  const today = new Date().toISOString().slice(0, 10);
  const alreadyDone = entries.some(e => e.createdAt.slice(0, 10) === today);
  if (alreadyDone) return;
  if (Notification.permission === "granted") {
    new Notification("Zeit für deine Plank", { body: "Starte jetzt deinen Timer und halte deine Serie am Leben.", icon: "icon.svg" });
  }
}

$("enableReminderBtn").onclick = async () => {
  if (!("Notification" in window)) {
    reminderStatus.textContent = "Dieser Browser unterstützt keine Benachrichtigungen.";
    return;
  }
  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    localStorage.setItem(REMINDER_KEY, reminderTime.value);
    scheduleReminder();
  } else {
    reminderStatus.textContent = "Benachrichtigungen wurden nicht erlaubt.";
  }
};

reminderTime.onchange = () => {
  localStorage.setItem(REMINDER_KEY, reminderTime.value);
  if (Notification.permission === "granted") scheduleReminder();
};

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}

if ("Notification" in window && Notification.permission === "granted") scheduleReminder();
render();
