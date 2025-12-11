# Quick Fix for Render Deployment Error

## The Problem
Render is showing: `Cannot find package 'express'` because:
1. Root directory is not set to `backend`
2. Dependencies are not being installed correctly

## Solution: Manual Configuration in Render Dashboard

Since Render might not be picking up `render.yaml` automatically, configure it manually:

### Step 1: Go to Render Dashboard
1. Go to your service: https://dashboard.render.com/web/srv-d4t9ive3jp1c73ea530g
2. Click **"Settings"** in the left sidebar

### Step 2: Set Root Directory
1. Scroll down to **"Build & Deploy"** section
2. Find **"Root Directory"** field
3. Set it to: `backend` ⚠️ **CRITICAL**
4. Click **"Save Changes"**

### Step 3: Verify Build Command
1. In the same **"Build & Deploy"** section
2. Find **"Build Command"** field
3. Set it to: `npm install`
4. Click **"Save Changes"**

### Step 4: Verify Start Command
1. In the same **"Build & Deploy"** section
2. Find **"Start Command"** field
3. Set it to: `npm start`
4. Click **"Save Changes"**

### Step 5: Redeploy
1. Go to **"Events"** in the left sidebar
2. Click **"Manual Deploy"** → **"Deploy latest commit"**
3. Or wait for auto-deploy after git push

## Alternative: Delete and Recreate Service

If the above doesn't work:

1. **Delete the current service** (Settings → Danger Zone → Delete)
2. **Create a new Web Service:**
   - Click "New +" → "Web Service"
   - Connect your GitHub repo
   - **Name**: `ecom-backend`
   - **Root Directory**: `backend` ⚠️ **MUST BE SET**
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - Add all environment variables
   - Click "Create Web Service"

## Verify Configuration

After deployment, check logs. You should see:
- `npm install` running successfully
- `npm start` executing
- `[server] Routes registered`
- `[server] Database initialized`
- `[server] Listening on http://localhost:3001`

## Still Having Issues?

Check:
1. ✅ Root Directory is set to `backend` (not empty, not `.`, not `src`)
2. ✅ Build Command is `npm install` (not `cd backend && npm install`)
3. ✅ Start Command is `npm start` (not `cd backend && npm start`)
4. ✅ All environment variables are set
5. ✅ MongoDB Atlas Network Access allows Render IPs (0.0.0.0/0)

