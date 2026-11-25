// =============================================================
// register.js — registration page
// =============================================================

if (Auth.getSession()) {
  location.replace("dashboard.html");
}

const registerForm = document.getElementById("register-form");
const usernameInput = document.getElementById("username");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmInput = document.getElementById("confirm");
const submitBtn = document.getElementById("submit-btn");
const alertBox = document.getElementById("alert");
const ruleLength = document.getElementById("rule-length");
const ruleNumber = document.getElementById("rule-number");

function showAlert(message, type) {
  alertBox.textContent = message;
  alertBox.className = `alert alert-${type}`;
  alertBox.hidden = false;
}

function setFieldError(input, message) {
  document.getElementById(`${input.id}-error`).textContent = message;
  input.classList.toggle("invalid", message !== "");
}

if (!Auth.isCryptoAvailable()) {
  showAlert("Secure hashing is blocked here. Open the page via a local server or the live demo link.", "error");
  submitBtn.disabled = true;
}

setUpPasswordToggles();

// Live password checklist: each rule turns green when it is met
function updatePasswordRules() {
  const rules = Auth.checkPassword(passwordInput.value);
  ruleLength.classList.toggle("met", rules.longEnough);
  ruleNumber.classList.toggle("met", rules.hasNumber);
}

passwordInput.addEventListener("input", updatePasswordRules);

[usernameInput, emailInput, passwordInput, confirmInput].forEach((input) => {
  input.addEventListener("input", () => setFieldError(input, ""));
});

// Returns an error message for each field ("" means the field is fine)
function validate(values) {
  const errors = {};

  if (!values.username) {
    errors.username = "Please choose a username.";
  } else if (!Auth.USERNAME_PATTERN.test(values.username)) {
    errors.username = "Use 3–20 letters, numbers or underscores.";
  }

  if (!values.email) {
    errors.email = "Please enter your email.";
  } else if (!Auth.EMAIL_PATTERN.test(values.email)) {
    errors.email = "Please enter a valid email address.";
  }

  const rules = Auth.checkPassword(values.password);
  if (!values.password) {
    errors.password = "Please create a password.";
  } else if (!rules.longEnough || !rules.hasNumber) {
    errors.password = "Password must be at least 8 characters and include a number.";
  }

  if (!values.confirm) {
    errors.confirm = "Please confirm your password.";
  } else if (values.confirm !== values.password) {
    errors.confirm = "Passwords do not match.";
  }

  return errors;
}

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  alertBox.hidden = true;

  const values = {
    username: usernameInput.value.trim(),
    email: emailInput.value.trim(),
    password: passwordInput.value,
    confirm: confirmInput.value,
  };

  const errors = validate(values);
  const inputs = { username: usernameInput, email: emailInput, password: passwordInput, confirm: confirmInput };
  Object.entries(inputs).forEach(([name, input]) => setFieldError(input, errors[name] || ""));

  const firstInvalid = Object.keys(inputs).find((name) => errors[name]);
  if (firstInvalid) {
    inputs[firstInvalid].focus();
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Creating account…";

  const result = await Auth.register(values);

  if (result.ok) {
    location.href = "index.html?reason=registered";
    return;
  }

  // Duplicate username or email
  setFieldError(inputs[result.field], result.message);
  inputs[result.field].focus();
  submitBtn.disabled = false;
  submitBtn.textContent = "Register";
});
