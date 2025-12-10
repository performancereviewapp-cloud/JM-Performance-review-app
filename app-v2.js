// Main App Logic - Firebase + MSAL Edition
logToScreen("app-v2.js: Script Starting...");

let currentUser = null;
let dbData = { employees: [], reviews: [] };

// --- 1. Auth & Initialization ---

// Called by auth.js when login is successful (O365)
// Called by auth.js when login is successful (O365)
async function onO365Ready(accessToken, msalAccount) {
    logToScreen("onO365Ready: Function Started");
    try {
        console.log("O365 Login Success. Checking Firebase...");
        document.getElementById('connectionStatus').textContent = "Checking Database...";

        // IMMEDIATE CHECK: Did Firebase load?
        if (!window.db) {
            logToScreen("onO365Ready: CRITICAL - No DB");
            document.getElementById('connectionStatus').textContent = "Checking Database...";
            return;
        }

        // Use email as key
        const email = msalAccount.username.toLowerCase();
        logToScreen("onO365Ready: Verified Email " + email);

        // Check if user exists in Firebase
        logToScreen("onO365Ready: Calling checkUserInFirebase...");
        await checkUserInFirebase(email, msalAccount);
        logToScreen("onO365Ready: checkUserInFirebase returned.");
    } catch (e) {
        logToScreen("onO365Ready FATAL ERROR: " + e.message);
        console.error(e);
    }
}

// 2. Firebase Data Logic
// 2. Firebase Data Logic
async function checkUserInFirebase(email, msalAccount) {
    logToScreen("checkUserInFirebase: Started for " + email);

    try {
        if (!window.db) throw new Error("No DB");
        logToScreen("checkUserInFirebase: DB object exists");

        // Sanitize
        logToScreen("checkUserInFirebase: Sanitizing email...");
        let cleanEmail = sanitizeEmail(email);
        logToScreen("checkUserInFirebase: Sanitized email: " + cleanEmail);

        const path = 'employees/' + cleanEmail;
        logToScreen("checkUserInFirebase: Path: " + path);

        const userRef = db.ref(path);
        logToScreen("checkUserInFirebase: Ref created. Starting query...");

        // DIRECT READ with Timeout
        let snapshot;
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Firebase Network Timeout (5s)")), 5000)
        );

        try {
            snapshot = await Promise.race([
                userRef.once('value'),
                timeoutPromise
            ]);
            logToScreen("checkUserInFirebase: Query returned!");
        } catch (readErr) {
            throw new Error("Read Failed: " + readErr.message);
        }

        logToScreen("checkUserInFirebase: Read complete. Value: " + (snapshot && snapshot.val() ? "Found" : "Null"));
        const user = snapshot.val();

        if (user) {
            logToScreen("checkUserInFirebase: User exists in DB");

            if (user.isDisabled) {
                showToast("Your account has been disabled. Please contact HR.", "error");
                await new Promise(r => setTimeout(r, 3000)); // Wait for toast
                signOut();
                return;
            }

            currentUser = user;
            // Update name if changed
            if (user.name !== msalAccount.name && msalAccount.name) {
                userRef.update({ name: msalAccount.name });
            }
            enterApp();
        } else {
            logToScreen("checkUserInFirebase: User NOT found. Checking for Admin Init...");

            // First user logic
            const allUsersSnap = await db.ref('employees').once('value');
            if (!allUsersSnap.exists()) {
                logToScreen("checkUserInFirebase: First user ever! Creating Admin...");
                const newAdmin = {
                    id: 'ADM-' + Date.now(),
                    name: msalAccount.name || 'Admin',
                    email: email,
                    role: 'hr',
                    department: 'Total Admin',
                    position: 'System Administrator',
                    managerEmail: ''
                };
                await userRef.set(newAdmin);
                currentUser = newAdmin;
                enterApp();
            } else {
                logToScreen("checkUserInFirebase: Access Denied");
                showToast("Access Denied. Your account is not registered. Please ask HR to add you.", "error");
                signOut();
            }
        }
    } catch (error) {
        logToScreen("CRASH caught: " + error.message);
        document.getElementById('connectionStatus').innerHTML = 'Error: ' + error.message;
    }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = '';
    if (type === 'success') icon = '✓';
    if (type === 'error') icon = '✕';
    if (type === 'warning') icon = '⚠';

    toast.innerHTML = `
        <div style="font-weight:bold; font-size:1.2rem; color:inherit">${icon}</div>
        <div class="toast-message">${message}</div>
    `;

    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function sanitizeEmail(email) {
    return email.replace(/[.#$[\]]/g, '_');
}

async function enterApp() {
    console.log("Entering App as", currentUser.role);
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    document.getElementById('userWelcome').textContent = `${currentUser.name} (${currentUser.role.toUpperCase()})`;

    // Load All Data (Realtime Sync)
    // We load everything for simplicity, filtering happens in UI.
    // In strict enterprise, we would use Rules or specific queries.
    db.ref('employees').on('value', snap => {
        const val = snap.val();
        dbData.employees = val ? Object.values(val) : [];
        refreshUI();
    });

    db.ref('reviews').on('value', snap => {
        const val = snap.val();
        dbData.reviews = val ? Object.values(val) : [];
        refreshUI();
    });

    // Setup Sidebar
    setupSidebar();
    showSection('dashboard');
}

// --- 3. UI Logic ---

function setupSidebar() {
    // Show/Hide menus based on Role
    document.getElementById('menuTeam').style.display = (currentUser.role === 'manager' || currentUser.role === 'hr') ? 'block' : 'none';
    document.getElementById('menuReviews').style.display = (currentUser.role === 'manager' || currentUser.role === 'hr') ? 'block' : 'none';
    document.getElementById('menuAdmin').style.display = (currentUser.role === 'hr') ? 'block' : 'none';
}

function showSection(sectionId) {
    // Hide all
    ['employeeView', 'managerView', 'hrView'].forEach(id => document.getElementById(id).style.display = 'none');

    // Reset Active Links
    document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));

    if (sectionId === 'dashboard') {
        // Default View based on Role
        if (currentUser.role === 'employee') {
            showEmployeeView();
            document.querySelector('a[onclick="showSection(\'dashboard\')"]').classList.add('active');
        } else if (currentUser.role === 'manager') {
            showManagerView();
            document.querySelector('a[onclick="showSection(\'dashboard\')"]').classList.add('active');
        } else {
            showHRView(); // HR Dashboard usually is Employees
            document.querySelector('a[onclick="showSection(\'dashboard\')"]').classList.add('active');
        }
    } else if (sectionId === 'team') {
        showManagerView();
        document.getElementById('menuTeam').querySelector('a').classList.add('active');
    } else if (sectionId === 'admin') {
        showHRView();
        document.getElementById('menuAdmin').querySelector('a').classList.add('active');
    }
}

function refreshUI() {
    // Re-render whatever view is open
    // Ideally we detect current view. For now, we rely on click.
    // But dashboard might need auto-update.
    if (document.getElementById('hrView').style.display === 'block') renderEmployeeList();
    if (document.getElementById('managerView').style.display === 'block') refreshManagerData();
    if (document.getElementById('employeeView').style.display === 'block') showEmployeeView();
}

// --- Views ---

function showEmployeeView() {
    document.getElementById('employeeView').style.display = 'block';
    document.getElementById('employeeInfo').textContent = `${currentUser.position} - ${currentUser.department}`;

    // Reviews
    const myReviews = dbData.reviews.filter(r => r.employeeEmail === currentUser.email);
    const container = document.getElementById('employeeReviewsList');

    // Check if active review
    const active = myReviews.find(r => r.status !== 'completed' && r.status !== 'archived');

    let html = '';

    if (active) {
        html += `
            <div class="card">
                <h3>Current Cycle: ${active.period}</h3>
                <p>Status: <span style="font-weight:bold; color:blue">${active.status}</span></p>
                <button onclick="openReviewModal('self', '${active.id}')" class="btn btn-primary">Continue Review</button>
            </div>
        `;
    } else {
        html += `
            <div class="card">
                <h3>Start New Review</h3>
                <p>No active review found.</p>
                <button onclick="openReviewModal('self')" class="btn btn-primary">Start Self-Review</button>
            </div>
        `;
    }

    // Past Reviews
    const past = myReviews.filter(r => r.status === 'completed');
    if (past.length > 0) {
        html += `<h3 style="grid-column: 1/-1; margin-top:20px;">History</h3>`;
        past.forEach(r => {
            html += `
            <div class="card">
                <h4>${r.period}</h4>
                <p>Final Rating: ${r.managerRating}/5</p>
                <button onclick="openReviewModal('self', '${r.id}')" class="btn btn-secondary">View</button>
            </div>`;
        });
    }

    container.innerHTML = html;
}

function showManagerView() {
    document.getElementById('managerView').style.display = 'block';
    refreshManagerData();
}

function refreshManagerData() {
    document.getElementById('managerInfo').textContent = "Team Overview";

    // My Team
    const myTeam = dbData.employees.filter(e => e.managerEmail && e.managerEmail.toLowerCase() === currentUser.email.toLowerCase());

    // Pending Reviews
    const pending = dbData.reviews.filter(r =>
        (r.managerEmail && r.managerEmail.toLowerCase() === currentUser.email.toLowerCase()) &&
        r.status === 'self-submitted'
    );

    // Render Pending
    const pendingContainer = document.getElementById('pendingSelfReviews');
    if (pending.length > 0) {
        pendingContainer.innerHTML = pending.map(r => `
            <div class="card">
                <h4>${r.employeeName}</h4>
                <p>Period: ${r.period}</p>
                <button onclick="openReviewModal('manager', '${r.id}')" class="btn btn-primary">Review</button>
            </div>
        `).join('');
    } else {
        pendingContainer.innerHTML = '<div class="card"><p>All caught up! No pending reviews.</p></div>';
    }

    // Render Team List
    const teamContainer = document.getElementById('managerTeamList');
    if (myTeam.length > 0) {
        teamContainer.innerHTML = myTeam.map(e => `
            <div class="list-item">
                <div>
                    <strong>${e.name}</strong><br>
                    <small>${e.position}</small>
                </div>
                <div>${e.department}</div>
            </div>
        `).join('');
    } else {
        teamContainer.innerHTML = '<p style="padding:20px;">No direct reports found.</p>';
    }
}

function showHRView() {
    document.getElementById('hrView').style.display = 'block';
    renderEmployeeList();
}

function renderEmployeeList() {
    const list = document.getElementById('employeeList');

    // Sort: HR first, then Manager, then ABC
    const sorted = [...dbData.employees].sort((a, b) => {
        if (a.role === 'hr' && b.role !== 'hr') return -1;
        if (a.role !== 'hr' && b.role === 'hr') return 1;
        return a.name.localeCompare(b.name);
    });

    if (sorted.length === 0) {
        list.innerHTML = '<p style="padding:20px; text-align:center; color:gray">No employees found.</p>';
        return;
    }

    let html = `
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Name / Role</th>
                        <th>Department</th>
                        <th>Manager</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    html += sorted.map(e => {
        const isActive = !e.isDisabled;
        const statusBadge = isActive
            ? '<span class="badge badge-active">Active</span>'
            : '<span class="badge badge-disabled">Disabled</span>';

        const rowStyle = isActive ? '' : 'opacity: 0.7; background: #fafafa;';

        return `
            <tr style="${rowStyle}">
                <td>
                    <div style="font-weight:500; color:#1e293b">${e.name}</div>
                    <div style="font-size:0.8rem; color:#64748b">${e.email}</div>
                    <div style="font-size:0.75rem; font-weight:bold; color:#3b82f6; margin-top:2px;">${e.role.toUpperCase()}</div>
                </td>
                <td>
                    ${e.department}<br>
                    <small style="color:#64748b">${e.position}</small>
                </td>
                <td style="font-size:0.9rem">${e.managerEmail || '<span style="color:#cbd5e1">None</span>'}</td>
                <td>${statusBadge}</td>
                <td>
                    <button onclick="openEmployeeModal('${e.id}')" class="action-btn edit" title="Edit Details">Edit</button>
                    
                    ${e.role !== 'hr' || e.email !== currentUser.email ? `
                        <button onclick="toggleEmployeeStatus('${e.id}')" class="action-btn disable" title="${isActive ? 'Disable Access' : 'Enable Access'}">
                            ${isActive ? 'Disable' : 'Enable'}
                        </button>
                        <button onclick="deleteEmployee('${e.id}')" class="action-btn delete" title="Delete User">Delete</button>
                    ` : ''}
                </td>
            </tr>
        `;
    }).join('');

    html += `</tbody></table></div>`;
    list.innerHTML = html;
}

// --- Features ---

// --- Employee Management Features ---

function openEmployeeModal(empId = null) {
    const modal = document.getElementById('employeeModal');
    const form = document.getElementById('employeeForm');
    form.reset();

    document.getElementById('userId').value = empId || '';

    if (empId) {
        const emp = dbData.employees.find(e => e.id === empId);
        if (emp) {
            document.getElementById('employeeModalTitle').textContent = "Edit Employee";
            document.getElementById('empName').value = emp.name;
            document.getElementById('empEmail').value = emp.email;
            document.getElementById('empEmail').disabled = true; // Email is key-ish
            document.getElementById('empManager').value = emp.managerEmail || '';
            document.getElementById('empDept').value = emp.department;
            document.getElementById('empPos').value = emp.position;
            document.getElementById('empRole').value = emp.role;
        }
    } else {
        document.getElementById('employeeModalTitle').textContent = "Add New Employee";
        document.getElementById('empEmail').disabled = false;
    }

    modal.style.display = 'flex';
}

function closeEmployeeModal() {
    document.getElementById('employeeModal').style.display = 'none';
}

// Bind Employee Form
document.addEventListener('DOMContentLoaded', () => {
    const empForm = document.getElementById('employeeForm');
    if (empForm) {
        empForm.onsubmit = async (e) => {
            e.preventDefault();

            const empId = document.getElementById('userId').value;
            const email = document.getElementById('empEmail').value.toLowerCase();
            const cleanEmail = sanitizeEmail(email);

            const userData = {
                name: document.getElementById('empName').value,
                email: email,
                managerEmail: document.getElementById('empManager').value.toLowerCase(),
                department: document.getElementById('empDept').value,
                position: document.getElementById('empPos').value,
                role: document.getElementById('empRole').value
            };

            if (!empId) {
                // New User
                userData.id = 'EMP-' + Date.now();
                userData.isDisabled = false;
            } else {
                // Existing, preserve some fields if needed
                const existing = dbData.employees.find(e => e.id === empId);
                userData.id = empId;
                if (existing) {
                    userData.isDisabled = existing.isDisabled || false;
                }
            }

            try {
                await db.ref('employees/' + cleanEmail).update(userData);
                showToast(empId ? "Employee Updated" : "Employee Added", "success");
                closeEmployeeModal();
            } catch (err) {
                showToast("Error saving: " + err.message, "error");
            }
        };
    }
});

function showAddEmployeeForm() {
    openEmployeeModal();
}

// --- Reusable Confirmation Modal ---
function showConfirm(title, message, onConfirm) {
    const modal = document.getElementById('confirmModal');
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;

    const btnYes = document.getElementById('btnConfirmAction');
    const btnNo = document.getElementById('btnConfirmCancel');

    // Clone to remove old listeners
    const newYes = btnYes.cloneNode(true);
    const newNo = btnNo.cloneNode(true);
    btnYes.parentNode.replaceChild(newYes, btnYes);
    btnNo.parentNode.replaceChild(newNo, btnNo);

    newYes.onclick = () => {
        modal.style.display = 'none';
        onConfirm();
    };

    newNo.onclick = () => {
        modal.style.display = 'none';
    };

    // Close on click outside
    modal.onclick = (e) => {
        if (e.target === modal) modal.style.display = 'none';
    }

    modal.style.display = 'flex';
}

async function toggleEmployeeStatus(empId) {
    const emp = dbData.employees.find(e => e.id === empId);
    if (!emp) return;

    const action = emp.isDisabled ? 'enable' : 'disable';
    const cleanEmail = sanitizeEmail(emp.email);

    showConfirm(
        `${action === 'enable' ? 'Enable' : 'Disable'} Access?`,
        `Are you sure you want to ${action} access for ${emp.name}? ${action === 'disable' ? 'They will no longer be able to log in.' : 'They will be able to log in again.'}`,
        async () => {
            try {
                await db.ref('employees/' + cleanEmail).update({ isDisabled: !emp.isDisabled });
                showToast(`User ${action}d successfully.`, "success");
            } catch (e) {
                showToast("Error: " + e.message, "error");
            }
        }
    );
}

async function deleteEmployee(empId) {
    const emp = dbData.employees.find(e => e.id === empId);
    if (!emp) return;

    const cleanEmail = sanitizeEmail(emp.email);

    showConfirm(
        "Delete Employee?",
        `This will permanently remove ${emp.name} and all their data. This action CANNOT be undone.`,
        async () => {
            try {
                await db.ref('employees/' + cleanEmail).remove();
                showToast("Employee permanently deleted.", "warning");
            } catch (e) {
                showToast("Error deleting: " + e.message, "error");
            }
        }
    );
}


// --- Reviews Modal ---
// (Reusing similar logic to before but adapting for Firebase)
function openReviewModal(type, reviewId = null) {
    const modal = document.getElementById('reviewModal');
    // ... (Use existing HTML form) ...
    const form = document.getElementById('reviewForm');
    form.reset();
    document.getElementById('reviewType').value = type;
    document.getElementById('reviewId').value = reviewId || '';

    // Logic to populate if editing...
    currentReviewId = reviewId;

    if (reviewId) {
        const review = dbData.reviews.find(r => r.id === reviewId);
        if (review) {
            document.getElementById('reviewPeriod').value = review.period;
            document.getElementById('selfAchievements').value = review.selfAchievements;
            document.getElementById('selfImprovements').value = review.selfImprovements;
            document.getElementById('selfRating').value = review.selfRating;

            if (review.managerComments) document.getElementById('managerComments').value = review.managerComments;
            if (review.managerRating) document.getElementById('managerRating').value = review.managerRating;

            // Show export if completed
            if (review.status === 'completed') {
                document.getElementById('btnExportPDF').style.display = 'inline-block';
            } else {
                document.getElementById('btnExportPDF').style.display = 'none';
            }
        }
    } else {
        document.getElementById('btnExportPDF').style.display = 'none';
    }

    // Show/Hide sections
    if (type === 'manager') {
        document.getElementById('managerSection').style.display = 'block';
        document.getElementById('reviewModalTitle').textContent = "Manager Review";
    } else {
        document.getElementById('managerSection').style.display = 'none';
        document.getElementById('reviewModalTitle').textContent = "Self Review";
    }

    modal.style.display = 'flex';
}

function closeReviewModal() {
    document.getElementById('reviewModal').style.display = 'none';
}

// Bind Review Submit
// Wait for DOM... or just assume user triggers it.
// We need to ensure textareas/inputs exist in index.html (I am assuming I kept them)

function bindEvents() {
    const reviewForm = document.getElementById('reviewForm');
    if (reviewForm) {
        reviewForm.onsubmit = async (e) => {
            e.preventDefault();
            const type = document.getElementById('reviewType').value;
            const rId = document.getElementById('reviewId').value;

            let reviewData = {};
            if (rId) {
                reviewData = dbData.reviews.find(r => r.id === rId) || {};
            } else {
                reviewData = {
                    id: 'REV-' + Date.now(),
                    employeeEmail: currentUser.email,
                    employeeName: currentUser.name,
                    managerEmail: currentUser.managerEmail,
                    status: 'self-submitted',
                    createdAt: new Date().toISOString()
                };
            }

            reviewData.period = document.getElementById('reviewPeriod').value;
            reviewData.selfAchievements = document.getElementById('selfAchievements').value;
            reviewData.selfImprovements = document.getElementById('selfImprovements').value;
            reviewData.selfRating = document.getElementById('selfRating').value;

            if (type === 'manager') {
                reviewData.managerComments = document.getElementById('managerComments').value;
                reviewData.managerRating = document.getElementById('managerRating').value;
                reviewData.status = 'completed';
            }

            // Save
            await db.ref('reviews/' + reviewData.id).set(reviewData);
            closeReviewModal();
            showToast("Review Saved Successfully!", "success");
        };
    }
}

// Ensure binding happens on load
document.addEventListener('DOMContentLoaded', () => {
    bindEvents();
});

// PDF Export (Same as before)
async function exportCurrentReviewPDF() {
    if (!currentReviewId) return;
    const review = dbData.reviews.find(r => r.id === currentReviewId);
    if (!review) return;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.setFontSize(22);
    doc.setTextColor(30, 60, 114);
    doc.text("Performance Review", 105, 20, null, null, "center");

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Period: ${review.period}`, 105, 30, null, null, "center");

    doc.line(20, 35, 190, 35);

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Details", 20, 45);
    doc.setFontSize(11);
    doc.text(`Employee: ${review.employeeName}`, 20, 55);
    doc.text(`Manager: ${review.managerEmail || 'N/A'}`, 20, 62);

    doc.text(`Self Rating: ${review.selfRating}/5`, 20, 80);
    if (review.managerRating) doc.text(`Manager Rating: ${review.managerRating}/5`, 100, 80);

    doc.text("Achievements:", 20, 100);
    doc.text(doc.splitTextToSize(review.selfAchievements, 170), 20, 107);

    if (review.managerComments) {
        doc.text("Manager Comments:", 20, 160);
        doc.text(doc.splitTextToSize(review.managerComments, 170), 20, 167);
    }

    doc.save("Review.pdf");
}
