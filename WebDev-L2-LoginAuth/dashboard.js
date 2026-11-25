// =============================================================
// dashboard.js — protected page
// Runs in <head>: if there is no valid session, the visitor is sent
// to the login page before the dashboard is ever shown.
// =============================================================

function redirectToLogin(reason) {
  location.replace(`index.html?reason=${reason}`);
}

const currentUser = Auth.getCurrentUser();

if (!currentUser) {
  redirectToLogin("protected");
} else {
  document.addEventListener("DOMContentLoaded", showDashboard);
}

const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value) {
  return value ? dateTimeFormat.format(new Date(value)) : "This is your first login";
}

function setText(id, text) {
  document.getElementById(id).textContent = text;
}

function showDashboard() {
  const session = Auth.getSession();

  setText("user-avatar", currentUser.username.charAt(0).toUpperCase());
  setText("user-name", currentUser.username);
  setText("welcome-name", currentUser.username);
  setText("info-username", currentUser.username);
  setText("info-email", currentUser.email);
  setText("info-created", formatDate(currentUser.createdAt));
  setText("info-previous", formatDate(session.previousLoginAt));
  setText("info-login", formatDate(session.loginAt));
  setText("info-expires", formatDate(session.expiresAt));
  setText("info-hash", currentUser.passwordHash);

  document.getElementById("dashboard").hidden = false;

  document.getElementById("logout-btn").addEventListener("click", () => {
    Auth.logout();
    redirectToLogin("logout");
  });
}

// If the user logs out in another tab, leave this one too
window.addEventListener("storage", (event) => {
  if (event.key === Auth.SESSION_KEY && !Auth.getSession()) {
    redirectToLogin("protected");
  }
});

// Pressing "Back" after logging out can show a cached copy of this page.
// Re-check the session whenever the page is shown again.
window.addEventListener("pageshow", (event) => {
  if (event.persisted && !Auth.getSession()) {
    redirectToLogin("protected");
  }
});
