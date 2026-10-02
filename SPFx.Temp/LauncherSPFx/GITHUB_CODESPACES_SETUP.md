# GitHub Codespaces Setup Guide

**Objective**: Get your SPFx project building in the cloud without local npm/Heft/esbuild

**Timeline**: ~5 minutes for setup, ~5 minutes for build

---

## Prerequisites

- GitHub account (free tier works)
- Web browser
- This repository code ready locally

---

## Step 1: Create GitHub Repository

### Option A: Create New Repository on GitHub

1. Go to **https://github.com/new**
2. Fill in:
   - **Repository name**: `spfx-pluggable-launcher` (or your choice)
   - **Description**: "One-time-build, unlimited-plugins SharePoint Framework"
   - **Privacy**: Choose "Private" or "Public"
3. **DO NOT** initialize with README, .gitignore, or license (we have those)
4. Click **Create repository**
5. You'll see: "Quick setup — if you've done this kind of thing before"

### Option B: Use Existing GitHub Repository

If you already have a repo, skip to Step 2.

---

## Step 2: Push Local Repository to GitHub

**On Your Windows Machine** (in PowerShell):

```powershell
cd c:\Davis\vibe\SPFx\LauncherSPFx

# Add GitHub remote (replace USERNAME and REPO with your values)
git remote add origin https://github.com/USERNAME/spfx-pluggable-launcher.git

# Verify remote added
git remote -v
# Should show:
# origin  https://github.com/USERNAME/spfx-pluggable-launcher.git (fetch)
# origin  https://github.com/USERNAME/spfx-pluggable-launcher.git (push)

# Push to GitHub
git branch -M main
git push -u origin main

# This uploads all your commits and code to GitHub
```

**GitHub asks for credentials**:
- If using HTTPS: GitHub will prompt for username + personal access token
  - Create token: https://github.com/settings/tokens/new
  - Scopes needed: `repo` (all)
  - Save token in a safe place
  
- If using SSH (recommended for repeat use):
  ```bash
  # Generate SSH key (if not already done)
  ssh-keygen -t ed25519 -C "your_email@example.com"
  
  # Add to SSH agent
  ssh-add ~/.ssh/id_ed25519
  
  # Add public key to GitHub:
  # https://github.com/settings/ssh/new
  # Paste contents of: ~/.ssh/id_ed25519.pub
  
  # Change remote URL to SSH
  git remote set-url origin git@github.com:USERNAME/spfx-pluggable-launcher.git
  ```

**Verify Push Succeeded**:
- Go to your GitHub repository page
- You should see all your files and commits listed

---

## Step 3: Create GitHub Codespaces Environment

### Create Codespace

1. Go to your GitHub repository: `https://github.com/USERNAME/spfx-pluggable-launcher`
2. Click **Code** button (green, top-right)
3. Click **Codespaces** tab
4. Click **Create codespace on main**
5. Wait 2-3 minutes for environment to start
   - VS Code will open in your browser
   - Files appear in left sidebar
   - Terminal appears at bottom

### Codespaces Features

✅ Node.js 22 pre-installed  
✅ npm 10 pre-installed  
✅ Git pre-configured  
✅ 60 free hours/month  
✅ Auto-shutdown after 30 minutes idle  

---

## Step 4: Build in Codespaces

**In Codespaces Terminal** (should open automatically):

```bash
# Install npm dependencies
npm install
# Takes ~2-3 minutes

# Run build
npm run build
# Takes ~1-2 minutes

# Verify artifacts created
ls dist/

# Should show:
# launcher-host.sppkg (the SPFx package)
# plugins/ (folder with site-picker.js, data-viewer.js)
```

### If Build Fails

```bash
# Check versions
node --version    # Should be 22+
npm --version     # Should be 10+

# Clear cache and retry
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## Step 5: Download Build Artifacts

### From Codespaces

1. **File Explorer** (left sidebar) → `dist/` folder
2. **launcher-host.sppkg**:
   - Right-click → **Download**
   - Save to your Downloads folder
3. **plugins/** folder:
   - Right-click → **Download**
   - Save all .js files

### Or Via GitHub Releases (Advanced)

You can set up GitHub Actions to automatically create releases after build:

```yaml
# .github/workflows/build.yml
name: Build SPFx

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
      - run: npm install && npm run build
      - uses: actions/upload-artifact@v3
        with:
          name: artifacts
          path: dist/
```

---

## Step 6: Deploy to SharePoint

Once you have the artifacts, follow the deployment steps in [SPFx.Launcher.Plan.md](SPFx.Launcher.Plan.md#step-3-deploy-to-sharepoint-after-build).

---

## Codespaces Tips & Tricks

### Customize Codespace Environment

**Add .devcontainer/devcontainer.json**:

```json
{
  "name": "SPFx Launcher",
  "image": "mcr.microsoft.com/devcontainers/javascript-node:22",
  "features": {
    "ghcr.io/devcontainers/features/git:1": {}
  },
  "postCreateCommand": "npm install",
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-vscode.vscode-typescript-next",
        "ms-vscode-remote.remote-containers"
      ]
    }
  }
}
```

This ensures every Codespace has the same setup.

### Use Multiple Codespaces

You can create separate Codespaces for:
- **main** branch (stable builds)
- **feature/phase-5** (UI components)
- **feature/phase-6** (testing)

Each has its own environment and won't interfere.

### Share Codespace

1. Click **Share** button (Codespaces top-right)
2. Select sharing option
3. Share link with team member
4. They can view/edit in real-time

### Pause Codespace (Save Hours)

1. GitHub.com → Your Codespaces page
2. Right-click Codespace → **Pause**
3. Resume later when needed

---

## Troubleshooting

### Error: "npm install" takes forever

**Cause**: Network timeout or large node_modules  
**Solution**:
```bash
npm cache clean --force
npm install
```

### Error: "Port 3000 already in use"

**Cause**: Process still running from previous attempt  
**Solution**:
```bash
# Kill all npm/node processes
pkill -f "node"
npm run build
```

### Error: "Cannot find module 'heft'"

**Cause**: npm install didn't complete  
**Solution**:
```bash
rm -rf node_modules package-lock.json
npm install --verbose
# Check for errors in output
```

### Codespace Won't Start

**Cause**: Resource limit or service issue  
**Solution**:
1. Delete Codespace: GitHub.com → Codespaces → Delete
2. Create new Codespace
3. Should start fresh in 2-3 minutes

---

## Next: Phases 5-7

After your first successful build:

1. **Phase 5** (2-3 hrs): Create shared UI components
   - SiteCard, PersonCard, PluginRegistry, EventMonitor
   
2. **Phase 6** (4-6 hrs): Add unit & integration tests
   - Service tests, component tests, integration tests
   
3. **Phase 7** (2-3 hrs): Deploy & document
   - Upload to app catalog, configure plugins, verify

---

## Reference

- **SPFx Launcher Plan**: [SPFx.Launcher.Plan.md](SPFx.Launcher.Plan.md)
- **Architecture Overview**: [ReadMe/ARCHITECTURE_OVERVIEW.md](../ReadMe/ARCHITECTURE_OVERVIEW.md)
- **GitHub Codespaces Docs**: https://docs.github.com/en/codespaces
- **GitHub Personal Access Tokens**: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens

