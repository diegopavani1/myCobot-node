# GitHub Actions CI/CD Workflow

## Overview

This repository includes an automated CI/CD pipeline that publishes the npm package to the npm registry whenever code is merged to the `main` branch.

## Setup Instructions

### 1. Create NPM Access Token

1. Go to [npmjs.com](https://www.npmjs.com/) and log in to your account
2. Click on your profile picture → "Access Tokens"
3. Click "Generate New Token" → Choose "Automation" (for CI/CD)
4. Copy the generated token (starts with `npm_`)

### 2. Add GitHub Secrets

1. Go to your GitHub repository settings
2. Navigate to "Secrets and variables" → "Actions"
3. Click "New repository secret"
4. Add the following secret:
   - **Name**: `NPM_TOKEN`
   - **Value**: Your npm access token from step 1

### 3. How It Works

The workflow (`publish.yml`) automatically:

✅ **Triggers on**:
- Push to `main` branch
- Manual workflow dispatch

✅ **Performs**:
- Installs dependencies
- Runs type checking (`npm run type-check`)
- Builds the project (`npm run build`)
- Checks if the current version already exists on npm
- Publishes to npm (only if version is new)
- Creates a GitHub release with the version tag

✅ **Smart Version Handling**:
- Only publishes if the version in `package.json` doesn't already exist on npm
- Skips publication if version exists (prevents errors)
- Shows clear logs about what happened

## Publishing a New Version

### Option 1: Using NPM Scripts (Recommended)
```bash
# For bug fixes
npm run version:patch

# For new features
npm run version:minor

# For breaking changes
npm run version:major
```

### Option 2: Manual Version Update
1. Update the version in `package.json`
2. Commit and push to `main` branch
3. The workflow will automatically publish

### Example Version Updates
```bash
# Current version: 1.0.0
npm run version:patch  # → 1.0.1 (bug fixes)
npm run version:minor  # → 1.1.0 (new features)
npm run version:major  # → 2.0.0 (breaking changes)
```

## Workflow Features

- 🔄 **Automatic**: No manual intervention needed
- 🛡️ **Safe**: Only publishes new versions
- 📦 **Optimized**: Uses npm cache for faster builds
- 🏷️ **Tagged**: Creates GitHub releases automatically
- 📋 **Logged**: Clear success/skip messages

## Troubleshooting

### Common Issues

1. **"NPM_TOKEN not found"**
   - Make sure you've added the `NPM_TOKEN` secret in GitHub repository settings

2. **"Permission denied"**
   - Verify your npm token has "Automation" permissions
   - Check that you have publish rights to the package name

3. **"Version already exists"**
   - This is normal! Update the version in `package.json` and push again
   - The workflow will skip publishing existing versions

4. **Build failures**
   - Check that all code compiles locally: `npm run type-check`
   - Ensure all dependencies are in `package.json`

### Manual Publishing (if needed)

If you need to publish manually:
```bash
npm run prepublishOnly  # Build and verify
npm publish --access public
```

## Security Notes

- The `NPM_TOKEN` secret is only accessible to the workflow
- Tokens are never logged or exposed in workflow output
- Use "Automation" tokens (not "Publish" tokens) for better security
