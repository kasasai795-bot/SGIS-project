const BASE_URL = "http://localhost:8080/api";

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch (e) {
    return {};
  }
}

function isLoggedIn() {
  const u = getUser();
  return !!(u && u.email);
}

function logout() {
  localStorage.clear();
  window.location.href = "login.html";
}

function requireLogin() {
  if (!isLoggedIn()) {
    window.location.href = "login.html";
  }
}

function requireAdmin() {
  const user = getUser();
  if (!isLoggedIn() || user.role !== "ADMIN") {
    window.location.href = "login.html";
  }
}

async function apiCall(endpoint, method = "GET", body = null) {
  const user = getUser();
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-user-email": user.email || ""
    }
  };
  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetch(BASE_URL + endpoint, options);
    const json = await res.json();
    return json;
  } catch (err) {
    console.error("API error:", err);
    showAlert("Could not connect to server. Is the backend running?", true);
    return null;
  }
}

function showAlert(message, isError = false) {
  const existing = document.getElementById("sgis-alert");
  if (existing) existing.remove();

  const div = document.createElement("div");
  div.id = "sgis-alert";
  div.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 9999;
    padding: 12px 20px; border-radius: 8px; font-size: 14px; font-family: Inter, sans-serif;
    background: ${isError ? "#e53e3e" : "#38a169"}; color: white;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  `;
  div.textContent = message;
  document.body.appendChild(div);
  setTimeout(() => { if (div.parentNode) div.remove(); }, 3500);
}

function statusBadge(status) {
  const map = {
    "Submitted":   "open",
    "Assigned":    "in-progress",
    "In Progress": "in-progress",
    "Resolved":    "resolved"
  };
  return `<span class="status-badge ${map[status] || "open"}">${status}</span>`;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}