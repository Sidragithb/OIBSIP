// =============================================================
// login.js — login page
// =============================================================

// Already logged in? Go straight to the dashboard.
if (Auth.getSession()) {
  location.replace("dashboard.html");
}

const loginForm = document.getElementById("login-form");
const identifierInput = document.getElementById("identifier");
const passwordInput = document.getElementById("password");
const submitBtn = document.getElementById("submit-btn");
const alertBox = document.getElementById("alert");

function showAlert(message, type) {
  alertBox.textContent = message;
  alertBox.className = `alert alert-${type}`;
  alertBox.hidden = false;
}

function setFieldError(input, message) {
  document.getElementById(`${input.id}-error`).textContent = message;
  input.classList.toggle("invalid", message !== "");
}

// Messages passed from other pages in the URL, e.g. index.html?reason=logout
const reasonMessages = {
  registered: ["Account created! Please log in.", "success"],
  logout: ["You have been logged out.", "info"],
  protected: ["Please log in to view the dashboard.", "warning"],
};
const reason = new URLSearchParams(location.search).get("reason");
if (reasonMessages[reason]) {
  showAlert(...reasonMessages[reason]);
}

if (!Auth.isCryptoAvailable()) {
  showAlert("Secure hashing is blocked here. Open the page via a local server or the live demo link.", "error");
  submitBtn.disabled = true;
}

setUpPasswordToggles();

[identifierInput, passwordInput].forEach((input) => {
  input.addEventListener("input", () => setFieldError(input, ""));
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  alertBox.hidden = true;

  const identifier = identifierInput.value.trim();
  const password = passwordInput.value;

  // Basic validation: no empty submissions
  setFieldError(identifierInput, identifier ? "" : "Please enter your username or email.");
  setFieldError(passwordInput, password ? "" : "Please enter your password.");
  if (!identifier || !password) return;

  submitBtn.disabled = true;
  submitBtn.textContent = "Logging in…";

  const result = await Auth.login(identifier, password);

  if (result.ok) {
    location.replace("dashboard.html");
    return;
  }

  // Same message for a wrong username and a wrong password,
  // so the page never reveals which one was incorrect.
  showAlert("Invalid username/email or password.", "error");
  passwordInput.value = "";
  passwordInput.focus();
  submitBtn.disabled = false;
  submitBtn.textContent = "Login";
});
