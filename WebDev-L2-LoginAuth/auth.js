// =============================================================
// auth.js — shared by every page
// Handles: storing users, hashing passwords, and the login session.
//
// Storage (browser localStorage):
//   "oibsip-auth-users"   → array of users (passwords are HASHED, never plain text)
//   "oibsip-auth-session" → who is logged in and when the session expires
//
// Hashing: PBKDF2 with SHA-256, 100,000 iterations and a random 16-byte salt
// per user, using the browser's built-in Web Crypto API (crypto.subtle).
// =============================================================

const Auth = (() => {
  const USERS_KEY = "oibsip-auth-users";
  const SESSION_KEY = "oibsip-auth-session";
  const SESSION_HOURS = 1;
  const PBKDF2_ITERATIONS = 100000;

  // ----- Storage helpers -----

  function readJSON(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function getUsers() {
    const users = readJSON(USERS_KEY, []);
    return Array.isArray(users) ? users : [];
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  function findUser(identifier) {
    const value = identifier.trim().toLowerCase();
    return getUsers().find(
      (user) => user.username.toLowerCase() === value || user.email === value
    );
  }

  // ----- Hashing -----

  function toHex(bytes) {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function fromHex(hex) {
    return new Uint8Array(hex.match(/../g).map((pair) => parseInt(pair, 16)));
  }

  function isCryptoAvailable() {
    return Boolean(window.crypto && window.crypto.subtle);
  }

  async function hashPassword(password, saltHex) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveBits"]
    );
    const bits = await crypto.subtle.deriveBits(
      { name: "PBKDF2", salt: fromHex(saltHex), iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
      keyMaterial,
      256
    );
    return toHex(new Uint8Array(bits));
  }

  // ----- Validation rules (used by the registration page) -----

  const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,20}$/;
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function checkPassword(password) {
    return {
      longEnough: password.length >= 8,
      hasNumber: /\d/.test(password),
    };
  }

  // ----- Register / login / logout -----

  async function register({ username, email, password }) {
    const users = getUsers();
    const lowerName = username.toLowerCase();
    const lowerEmail = email.toLowerCase();

    // Duplicate checks (case-insensitive)
    if (users.some((user) => user.username.toLowerCase() === lowerName)) {
      return { ok: false, field: "username", message: "This username is already taken." };
    }
    if (users.some((user) => user.email === lowerEmail)) {
      return { ok: false, field: "email", message: "An account with this email already exists." };
    }

    const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
    const passwordHash = await hashPassword(password, salt);

    users.push({
      username,
      email: lowerEmail,
      salt,
      passwordHash,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    });
    saveUsers(users);
    return { ok: true };
  }

  async function login(identifier, password) {
    const user = findUser(identifier);

    // Hash even when the user doesn't exist, so a wrong username and a wrong
    // password take the same time and give the same answer.
    const hash = await hashPassword(password, user ? user.salt : "00".repeat(16));
    if (!user || hash !== user.passwordHash) {
      return { ok: false };
    }

    const now = new Date().toISOString();
    const users = getUsers();
    const stored = users.find((u) => u.username === user.username);
    const previousLoginAt = stored.lastLoginAt;
    stored.lastLoginAt = now;
    saveUsers(users);

    const session = {
      username: user.username,
      loginAt: now,
      previousLoginAt,
      expiresAt: Date.now() + SESSION_HOURS * 60 * 60 * 1000,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return { ok: true };
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
  }

  // Returns the session if it is valid, otherwise null
  function getSession() {
    const session = readJSON(SESSION_KEY, null);
    const userExists = session && getUsers().some((u) => u.username === session.username);

    if (!session || !userExists || Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  }

  function getCurrentUser() {
    const session = getSession();
    return session ? getUsers().find((u) => u.username === session.username) : null;
  }

  return {
    USERNAME_PATTERN,
    EMAIL_PATTERN,
    SESSION_KEY,
    checkPassword,
    isCryptoAvailable,
    register,
    login,
    logout,
    getSession,
    getCurrentUser,
  };
})();

// Show / hide password buttons (used on the login and register pages)
function setUpPasswordToggles() {
  document.querySelectorAll(".toggle-password").forEach((button) => {
    button.addEventListener("click", () => {
      const field = document.getElementById(button.dataset.target);
      const show = field.type === "password";
      field.type = show ? "text" : "password";
      button.textContent = show ? "Hide" : "Show";
      button.setAttribute("aria-pressed", String(show));
    });
  });
}
