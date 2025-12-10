// Authentication Logic

const myMSALObj = new msal.PublicClientApplication(msalConfig);

let username = "";
let accessToken = null;

// Initial Load
async function initAuth() {
    try {
        const response = await myMSALObj.handleRedirectPromise();
        if (response) {
            handleResponse(response);
        } else {
            // Check if user is already signed in
            const currentAccounts = myMSALObj.getAllAccounts();
            if (currentAccounts.length > 0) {
                username = currentAccounts[0].username;
                showWelcomeMessage(currentAccounts[0]);
                acquireToken();
            } else {
                showSignInButton();
            }
        }
    } catch (error) {
        console.error(error);
    }
}

function handleResponse(response) {
    if (response !== null) {
        username = response.account.username;
        showWelcomeMessage(response.account);
        acquireToken();
    } else {
        showSignInButton();
    }
}

function signIn() {
    myMSALObj.loginPopup(loginRequest)
        .then(handleResponse)
        .catch(error => {
            console.error(error);
        });
}

function signOut() {
    const logoutRequest = {
        account: myMSALObj.getAccountByUsername(username),
        postLogoutRedirectUri: msalConfig.auth.redirectUri,
        mainWindowRedirectUri: msalConfig.auth.redirectUri
    };
    myMSALObj.logoutPopup(logoutRequest);
}

// Get Token for Graph API
async function acquireToken() {
    const request = {
        scopes: loginRequest.scopes,
        account: myMSALObj.getAccountByUsername(username)
    };

    try {
        const response = await myMSALObj.acquireTokenSilent(request);
        accessToken = response.accessToken;

        console.log("Token acquired.");
        // Initialize App Data
        document.getElementById('connectionStatus').textContent = '🟢 Connected to O365';
        document.getElementById('connectionStatus').style.color = '#34a853'; // Green

        // Let the main app know we are ready
        if (typeof onO365Ready === 'function') {
            onO365Ready(accessToken, response.account);
        }

    } catch (error) {
        console.warn("Silent token acquisition failed. Acquiring via popup.", error);
        if (error instanceof msal.InteractionRequiredAuthError) {
            myMSALObj.acquireTokenPopup(request).then(response => {
                accessToken = response.accessToken;
                if (typeof onO365Ready === 'function') {
                    onO365Ready(accessToken, response.account);
                }
            }).catch(error => {
                console.error(error);
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
