// Authentication Logic
try {
    logToScreen("auth.js: Script Starting...");

    // Check Dependencies
    if (typeof msal === 'undefined') {
        throw new Error("MSAL Library not loaded from CDN.");
    }
    if (typeof msalConfig === 'undefined') {
        throw new Error("msalConfig not found. using default.");
    }

    const myMSALObj = new msal.PublicClientApplication(msalConfig);

    // Explicitly Attach to Window to prevent Scope issues
    window.myMSALObj = myMSALObj;
    window.username = "";

} catch (e) {
    console.error(e);
    if (window.logToScreen) logToScreen("auth.js CRASH: " + e.message);
}

// Initial Load
async function initAuth() {
    logToScreen("auth.js: initAuth called");
    try {
        const response = await myMSALObj.handleRedirectPromise();
        if (response) {
            logToScreen("auth.js: Handle Redirect Response");
            handleResponse(response);
        } else {
            // Check if user is already signed in
            const currentAccounts = myMSALObj.getAllAccounts();
            if (currentAccounts.length > 0) {
                logToScreen("auth.js: User found in cache: " + currentAccounts[0].username);
                username = currentAccounts[0].username;
                showWelcomeMessage(currentAccounts[0]);
                acquireToken();
            } else {
                logToScreen("auth.js: No user, showing sign-in");
                showSignInButton();
            }
        }
    } catch (error) {
        logToScreen("auth.js ERROR: " + error.message);
    }
}

function handleResponse(response) {
    if (response !== null) {
        logToScreen("auth.js: Login Success for " + response.account.username);
        username = response.account.username;
        showWelcomeMessage(response.account);
        acquireToken();
    } else {
        showSignInButton();
    }
}

async function acquireToken() {
    logToScreen("auth.js: acquiring token...");
    const request = {
        scopes: loginRequest.scopes,
        account: myMSALObj.getAccountByUsername(username)
    };

    try {
        const response = await myMSALObj.acquireTokenSilent(request);
        accessToken = response.accessToken;
        logToScreen("auth.js: Token Acquired silently");
        document.getElementById('connectionStatus').textContent = '🟢 Connected to O365';
        document.getElementById('connectionStatus').style.color = '#34a853';

        if (typeof onO365Ready === 'function') {
            logToScreen("auth.js: Calling onO365Ready...");
            onO365Ready(accessToken, response.account);
        }
    } catch (error) {
        logToScreen("auth.js: Silent token failed. Trying popup.");
        if (error instanceof msal.InteractionRequiredAuthError) {
            myMSALObj.acquireTokenPopup(request).then(response => {
                logToScreen("auth.js: Popup Token Success");
                accessToken = response.accessToken;
                if (typeof onO365Ready === 'function') {
                    onO365Ready(accessToken, response.account);
                }
            }).catch(error => {
                logToScreen("auth.js: Popup Token Failed: " + error.message);
            });
        }
    }
}

// UI Helpers
function showWelcomeMessage(account) {
    // Hide Login Screen handled by app.js mostly, but here we trigger state
    console.log("Logged in as:", account.username);
}

function showSignInButton() {
    // Show login screen
    console.log("Please sign in");
    const statusEl = document.getElementById('connectionStatus');
    if (statusEl) {
        statusEl.style.display = 'none';
    }
}
// Explicit Exports
window.signIn = signIn;
window.signOut = signOut;
window.initAuth = initAuth;
logToScreen("auth.js: Functions Exported.");

// Auto-start
initAuth();
