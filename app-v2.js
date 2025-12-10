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
            alert("CRITICAL ERROR: Firebase Database not loaded.");
            document.getElementById('connectionStatus').innerHTML = '<span style="color:red">Firebase SDK Missing</span>';
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
        let cleanEmail = email.replace(/[.#$[\]]/g, '_'); // Inline for safety
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
        userRef.update({ name: msalAccount.name });
    }
        enterApp();
} else {
    alert("DEBUG: 6. User Not Found - Creating Admin");
    // First user logic
    const allUsersSnap = await db.ref('employees').once('value');
    if (!allUsersSnap.exists()) {
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
        alert("Access Denied. Your account is not registered. Please ask HR to add you.");
        signOut();
    }
}
} catch (error) {
    alert("CRASH caught: " + error.message);
    document.getElementById('connectionStatus').innerHTML = 'Error: ' + error.message;
}
}

function sanitizeEmail(email) {
    return email.replace(/\./g, ','); // Firebase keys can't have '.'
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
    list.innerHTML = dbData.employees.map(e => `
        <div class="list-item">
            <div>
                <strong>${e.name}</strong> (${e.role.toUpperCase()})<br>
                <small>${e.email}</small>
            </div>
            <div>
                ${e.department}<br>
                <span style="font-size:0.8rem; color:gray;">Mgr: ${e.managerEmail || 'None'}</span>
            </div>
        </div>
    `).join('');
}

// --- Features ---

function showAddEmployeeForm() {
    // We reuse logic but simpler: prompt or custom modal? 
    // Let's use CSS modal we already have but adapt it? 
    // Or just make a simple one. The user wanted "Professional".
    // I'll assume the previous 'addEmployeeFormSection' logic in HTML is available or recover it.
    // For now, let's inject a modal dynamically to be safe.
    const modalHtml = `
        <div id="addEmpModal" class="popup-overlay">
            <div class="popup-content">
                <h3>Add New Employee</h3>
                <form id="newEmpForm">
                    <div class="form-group"><label>Name</label><input id="newEmpName" required></div>
                    <div class="form-group"><label>Email</label><input id="newEmpEmail" type="email" required></div>
                    <div class="form-group"><label>Manager Email</label><input id="newEmpMgr" type="email"></div>
                    <div class="form-group"><label>Department</label><input id="newEmpDept" required></div>
                    <div class="form-group"><label>Position</label><input id="newEmpPos" required></div>
                    <div class="form-group"><label>Role</label>
                        <select id="newEmpRole">
                            <option value="employee">Employee</option>
                            <option value="manager">Manager</option>
                            <option value="hr">HR</option>
                        </select>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">Save User</button>
                        <button type="button" onclick="document.getElementById('addEmpModal').remove()" class="btn btn-secondary">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('newEmpForm').onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('newEmpEmail').value.toLowerCase();
        const newUser = {
            id: 'EMP-' + Date.now(),
            name: document.getElementById('newEmpName').value,
            email: email,
            managerEmail: document.getElementById('newEmpMgr').value.toLowerCase(),
            department: document.getElementById('newEmpDept').value,
            position: document.getElementById('newEmpPos').value,
            role: document.getElementById('newEmpRole').value
        };

        // Save to Firebase
        await db.ref('employees/' + sanitizeEmail(email)).set(newUser);
        document.getElementById('addEmpModal').remove();
        alert("User added! They can now log in.");
    };
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
            alert("Review Saved!");
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
