// Graph API Helper Functions

// Helper to call MS Graph API
async function callExecute(accessToken, url, method = "GET", body = null) {
    const headers = new Headers();
    const bearer = `Bearer ${accessToken}`;

    headers.append("Authorization", bearer);
    if (body) {
        headers.append("Content-Type", "application/json");
    }

    const options = {
        method: method,
        headers: headers,
        body: body ? JSON.stringify(body) : undefined
    };

    return fetch(url, options)
        .then(response => {
            if (!response.ok) {
                if (response.status === 404) return null; // File not found is okay
                throw new Error(`Graph API error: ${response.statusText}`);
            }
            return response.json().catch(() => ({})); // Handle empty responses
        })
        .catch(error => {
            console.error('API Call Error:', error);
            throw error;
        });
}

// 1. Initialize Storage (Create db.json if not exists)
async function initializeStorage(accessToken) {
    console.log("Checking OneDrive storage...");
    try {
        const data = await callExecute(accessToken, graphConfig.driveEndpoint);
        if (!data) {
            console.log("Database file not found. Creating new one...");
            const initialData = {
                employees: {},
                reviews: {}
            };
            await saveToOneDrive(accessToken, initialData);
            return initialData;
        }
        return data;
    } catch (e) {
        console.error("Error initializing storage:", e);
        // Try creating folder first if needed? OneDrive usually creates path automatically for PUT
        // But let's assume we need to handle 404 specifically
        // If 404, we create.
        if (e.message.includes('404')) {
            const initialData = {
                employees: {},
                reviews: {}
            };
            await saveToOneDrive(accessToken, initialData);
            return initialData;
        }
        throw e;
    }
}

// 2. Save Data to OneDrive
async function saveToOneDrive(accessToken, data) {
    console.log("Saving to OneDrive...");
    const headers = new Headers();
    headers.append("Authorization", `Bearer ${accessToken}`);
    headers.append("Content-Type", "application/json");

    const options = {
        method: "PUT",
        headers: headers,
        body: JSON.stringify(data, null, 2)
    };

    return fetch(graphConfig.driveEndpoint, options)
        .then(response => {
            if (!response.ok) {
                throw new Error("Failed to save data: " + response.statusText);
            }
            console.log("Saved successfully to OneDrive");
            return response.json();
        });
}

// 3. Send Email
async function sendGraphEmail(accessToken, toEmail, subject, content) {
    console.log(`Sending email to ${toEmail}...`);

    // Construct email object
    const emailData = {
        message: {
            subject: subject,
            body: {
                contentType: "HTML",
                content: content
            },
            toRecipients: [
                {
                    emailAddress: {
                        address: toEmail
                    }
                }
            ]
        },
        saveToSentItems: "true"
    };

    const headers = new Headers();
    headers.append("Authorization", `Bearer ${accessToken}`);
    headers.append("Content-Type", "application/json");

    return fetch(graphConfig.mailEndpoint, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(emailData)
    });
}
