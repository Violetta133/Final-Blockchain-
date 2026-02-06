const USERS_KEY = "acg_users";
const SESSION_KEY = "acg_session";

function getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || "{}"); }
  catch { return {}; }
}
function saveUsers(u) {
  localStorage.setItem(USERS_KEY, JSON.stringify(u));
}
function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
  catch { return null; }
}
function setSession(s) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(s));
}
function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

function showMsg(text, ok = true) {
  const box = document.getElementById("msgBox");
  box.innerHTML = `<div class="msg ${ok ? "ok" : "err"}">${text}</div>`;
  setTimeout(() => { box.innerHTML = ""; }, 3500);
}

function syncUI() {
  const s = getSession();
  const sessionBox = document.getElementById("sessionBox");
  const formsBox = document.getElementById("formsBox");
  const who = document.getElementById("who");

  if (s?.email) {
    sessionBox.style.display = "block";
    formsBox.style.display = "none";
    who.textContent = s.email;
  } else {
    sessionBox.style.display = "none";
    formsBox.style.display = "block";
  }
}

document.getElementById("registerForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("regEmail").value.trim().toLowerCase();
  const pass = document.getElementById("regPass").value;

  const users = getUsers();
  if (users[email]) return showMsg("User already exists", false);

  users[email] = { pass, wallet: null };
  saveUsers(users);

  setSession({ email, wallet: null });
  showMsg("Registered ✅", true);
  syncUI();
});

document.getElementById("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const email = document.getElementById("logEmail").value.trim().toLowerCase();
  const pass = document.getElementById("logPass").value;

  const users = getUsers();
  if (!users[email] || users[email].pass !== pass) {
    return showMsg("Wrong email or password", false);
  }

  setSession({ email, wallet: users[email].wallet || null });
  showMsg("Logged in ✅", true);
  syncUI();
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  clearSession();
  syncUI();
  showMsg("Logged out", true);
});

document.getElementById("goBtn").addEventListener("click", () => {
  // IMPORTANT: put correct path to your index.html
  window.location.href = "./index.html";
});

// init
syncUI();