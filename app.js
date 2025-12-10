// Main App Logic for O365 Edition

let currentUser = null; // O365 User Account
let dbData = { employees: [], reviews: [] }; // Local cache of OneDrive data
let currentAccessToken = null;

// Called by auth.js when login is successful
async function onO365Ready(accessToken, msalAccount) {
    currentAccessToken = accessToken;
    console.log("O365 Ready. Initializing App...");

    // 1. Load Data from OneDrive
    await loadDataFromOneDrive();

    // 2. Identify Current User in our "DB"
    // The MSAL account gives us the email. We check if this email exists in our employees list.
    // If not, and it's the FIRST user, we might make them Admin/HR? Or just show error?
    // User asked for "Free" and "Real time". 
    // We'll match email.

    const email = msalAccount.username.toLowerCase();

    // Find employee by email
    let employee = dbData.employees.find(e => e.email.toLowerCase() === email);

    if (!employee) {
        // First run? Or unregistered user.
        if (dbData.employees.length === 0) {
            console.log("No employees found. Creating initial HR account from current user.");
            employee = {
                id: 'HR001',
                name: msalAccount.name || 'Admin',
                email: msalAccount.username,
                role: 'hr',
                department: 'Administration',
                position: 'System Admin'
            };
            dbData.employees.push(employee);
            await saveToOneDrive(currentAccessToken, dbData);
        } else {
            alert("Access Denied: Your email is not registered in the system. Please contact HR.");
            return;
        }
    }

    currentUser = employee;

    // 3. Initialize UI
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    document.getElementById('userWelcome').textContent = `Welcome, ${currentUser.name}`;

    loadDashboard();
}

async function loadDataFromOneDrive() {
    try {
        const data = await initializeStorage(currentAccessToken);
        // Data format on disk: { employees: {...}, reviews: {...} } or array?
        // graph.js initializeStorage returns object.
        // Let's normalize it to arrays for app.js ease.

        if (Array.isArray(data.employees)) {
            dbData.employees = data.employees;
        } else if (typeof data.employees === 'object') {
            dbData.employees = Object.values(data.employees);
        } else {
            dbData.employees = [];
        }

        if (Array.isArray(data.reviews)) {
            dbData.reviews = data.reviews;
        } else if (typeof data.reviews === 'object') {
            dbData.reviews = Object.values(data.reviews);
        } else {
            dbData.reviews = [];
        }

        console.log("Data loaded:", dbData);
    } catch (e) {
        console.error("Failed to load data:", e);
        alert("Error loading data from OneDrive: " + e.message);
    }
}

async function saveData() {
    // Convert arrays back to whatever format we want? JSON is fine.
    try {
        await saveToOneDrive(currentAccessToken, dbData);
    } catch (e) {
        console.error("Save failed:", e);
        alert("Failed to save changes: " + e.message);
    }
}

function loadDashboard() {
    // Hide all
    ['employeeView', 'managerView', 'hrView'].forEach(id => document.getElementById(id).style.display = 'none');

    if (currentUser.role === 'hr') {
        showHRView();
    } else if (currentUser.role === 'manager') {
        showManagerView();
    } else {
        showEmployeeView();
    }
}

// --- Views ---

function showHRView() {
    document.getElementById('hrView').style.display = 'block';
    renderEmployeeList();
}

function showManagerView() {
    document.getElementById('managerView').style.display = 'block';
    // Logic for manager (simple version)
    document.getElementById('managerInfo').textContent = `${currentUser.department} - ${currentUser.position}`;
}

function showEmployeeView() {
    document.getElementById('employeeView').style.display = 'block';
    document.getElementById('employeeInfo').textContent = `${currentUser.department}`;
}

// --- HR Logic ---

function renderEmployeeList() {
    const list = document.getElementById('employeeList');
    list.innerHTML = dbData.employees.map(e => `
        <div style="padding: 10px; border-bottom: 1px solid #eee; display:flex; justify-content:space-between;">
            <div><strong>${e.name}</strong> (${e.role})<br><small>${e.email}</small></div>
        </div>
    `).join('');
}

function showAddEmployeeForm() {
    document.getElementById('addEmployeeFormSection').style.display = 'flex';
}

function cancelEmployeeForm() {
    document.getElementById('addEmployeeFormSection').style.display = 'none';
    document.getElementById('hrEmployeeForm').reset();
}

// Handle Add Employee
document.getElementById('hrEmployeeForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const newEmp = {
        id: Date.now().toString(),
        name: document.getElementById('empName').value,
        email: document.getElementById('empEmail').value,
        department: document.getElementById('empDepartment').value,
        position: document.getElementById('empPosition').value,
        role: document.getElementById('empRole').value
    };

    dbData.employees.push(newEmp);

    // Save to Cloud
    await saveData();

    // Notify (Email)
    try {
        await sendGraphEmail(currentAccessToken, newEmp.email, "Welcome to Performance Review",
            `<p>Hello ${newEmp.name},</p><p>You have been added to the system. Please login with your Microsoft account.</p>`);
        alert("Employee added and email sent!");
    } catch (err) {
        console.error("Email failed:", err);
        alert("Employee added but email failed.");
    }

    cancelEmployeeForm();
    renderEmployeeList();
});

// --- Toast Utils ---
function showToast(msg, type = 'info') {
    // simple impl
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.position = 'fixed';
    t.style.bottom = '20px';
    t.style.right = '20px';
    t.style.background = '#333';
    t.style.color = 'white';
    t.style.padding = '10px 20px';
    t.style.borderRadius = '5px';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}
