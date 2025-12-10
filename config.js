// Configuration for Microsoft Authentication Library (MSAL)
// IMPORTANT: You MUST register this app in Azure Portal to get a Client ID.
// 1. Go to https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade
// 2. Click "New registration"
// 3. Name: "Performance Review App"
// 4. Supported account types: "Accounts in any organizational directory (Any Azure AD directory - Multitenant) and personal Microsoft accounts" (for widest compatibility) OR "Single tenant" if internal only.
// 5. Redirect URI: "Single-page application (SPA)" -> "http://localhost:3000" (or your local URL)
// 6. Copy the "Application (client) ID" and paste it below.

const msalConfig = {
    auth: {
        clientId: "89d8367d-5737-44ca-8157-7b487a3dd3b4", // <--- REPLACE THIS WITH YOUR CLIENT ID
        authority: "https://login.microsoftonline.com/common",
        // Auto-detects the current page as the redirect URI. 
        // IMPORTANT: You must register EXACTLY this URL in Azure Portal.
        // For Localhost: http://localhost:3000/index.html
        // For GitHub: https://<your-username>.github.io/<repo-name>/index.html
        // We hardcode it now to prevent "index.html" vs "/" mismatches
        redirectUri: "https://performancereviewapp-cloud.github.io/JM-Performance-review-app/",
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false,
    }
};

// Scopes required for the application
const loginRequest = {
    scopes: ["User.Read", "Files.ReadWrite", "Mail.Send"]
};

// Graph API Endpoint
const graphConfig = {
    graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
    driveEndpoint: "https://graph.microsoft.com/v1.0/me/drive/root:/performance-review/db.json:/content",
    driveFolder: "https://graph.microsoft.com/v1.0/me/drive/root/children",
    mailEndpoint: "https://graph.microsoft.com/v1.0/me/sendMail"
};
