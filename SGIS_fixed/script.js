// ✅ Submit Complaint
const form = document.getElementById("complaintForm");

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      title: document.getElementById("title").value,
      description: document.getElementById("description").value,
    };

    await fetch("http://localhost:5000/complaints", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    alert("Complaint Submitted ✅");
    window.location.href = "user-dashboard.html";
  });
}

// ✅ Load Complaints
async function loadComplaints() {
  const res = await fetch("http://localhost:5000/complaints");
  const data = await res.json();

  const tbody = document.getElementById("complaintsBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  data.forEach((c) => {
    tbody.innerHTML += `
      <tr>
        <td>${c._id}</td>
        <td>${c.title}</td>
        <td>${c.category}</td>
        <td>${c.status}</td>
        <td>
          <button onclick="updateStatus('${c._id}', 'In Progress')">Start</button>
          <button onclick="updateStatus('${c._id}', 'Resolved')">Resolve</button>
        </td>
      </tr>
    `;
  });
}

// ✅ Update Status
async function updateStatus(id, status) {
  await fetch(`http://localhost:5000/complaints/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  alert("Status Updated ✅");
  loadComplaints();
}

// ✅ Show logged-in user
const userEmailElement = document.getElementById("userEmail");

if (userEmailElement) {
  const email = localStorage.getItem("userEmail");

  if (email) {
    userEmailElement.innerText = "logged in as : " + email;
  } else {
    userEmailElement.innerText = "Not logged in";
  }
}

// ✅ Logout
function logout(){
  localStorage.clear();
  window.location.href = "login.html";
}

// ✅ Auto load
loadComplaints();