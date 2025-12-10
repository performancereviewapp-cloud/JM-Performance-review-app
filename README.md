# Deploying to GitHub Pages

To make this app accessible online via GitHub Pages:

## 1. Create a GitHub Repository
1.  Go to [GitHub.com](https://github.com) and sign in.
2.  Click **New Repository**.
3.  Name it (e.g., `performance-review-app`).
4.  Make it **Public** (required for free GitHub Pages, unless you have Pro).
5.  Click **Create repository**.

## 1. Prerequisite: Install Git
**Note:** It appears Git is not installed on this computer. You need to install it to deploy.
1.  Download from [git-scm.com](https://git-scm.com/download/win).
2.  Install it (Next, Next, Next...).
3.  Restart your terminal/VS Code (or computer) for the command to work.

## 2. Push Code to GitHub
Once Git is installed, open a terminal in this folder (`c:\Users\JMGroup\Downloads\AG\performance-review-o365`) and run:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/performancereviewapp-cloud/JM-Performance-review-app.git
git push -u origin main
```
*(Replace `<YOUR-USERNAME>` and `<REPO-NAME>` with your details)*

## 3. Enable GitHub Pages
1.  Go to your repository **Settings** tab.
2.  Click **Pages** (on the left sidebar).
3.  Under **Build and deployment > Source**, select **Deploy from a branch**.
4.  Branch: **main** / **root**.
5.  Click **Save**.
6.  Wait a moment. GitHub will give you a URL like: `https://<user>.github.io/<repo>/`.

## 4. Updates Azure Registration (CRITICAL)
Your app will fail to login online until you do this step.

1.  Go back to the [Azure Portal > App Registrations](https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade).
2.  Select your **Performance Review App**.
3.  Go to **Authentication** (left menu).
4.  Under **Redirect URIs**, click **Add URI**.
5.  Add your new GitHub URL. **It must include `/index.html` at the end.**
    *   Example: `https://jmgroup.github.io/performance-review-app/index.html`
6.  Click **Save**.

Now you can access the app online!
