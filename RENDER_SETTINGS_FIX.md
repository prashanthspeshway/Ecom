# Fix Render Settings - Step by Step

## Current Problem
Your Build Command is: `npm install; npm run build`
But `npm run build` doesn't exist in backend/package.json, so dependencies aren't being installed properly.

## Fix in Render Dashboard

### Step 1: Go to Settings
1. Go to: https://dashboard.render.com/web/srv-d4tap0euk2gs73empid0/settings
2. Scroll to **"Build & Deploy"** section

### Step 2: Fix Build Command
1. Find **"Build Command"** field
2. **DELETE** the current value: `npm install; npm run build`
3. **REPLACE** with: `npm install`
4. Click **"Save Changes"**

### Step 3: Verify Start Command
1. Find **"Start Command"** field
2. Should be: `npm start`
3. If not, change it to: `npm start`
4. Click **"Save Changes"**

### Step 4: Verify Root Directory
1. Find **"Root Directory"** field (in General section)
2. Should be: `backend`
3. If not, change it to: `backend`
4. Click **"Save Changes"**

### Step 5: Redeploy
1. Go to **"Events"** in left sidebar
2. Click **"Manual Deploy"** → **"Deploy latest commit"**

## What Should Happen

After fixing, you should see in logs:
```
==> Running build command 'npm install'...
added XXX packages...
found 0 vulnerabilities
==> Build successful
==> Running 'npm start'
> ecom-backend@0.0.1 start
> node index.js
[server] Routes registered
[database] Connected to MongoDB: ecom
[server] Database initialized
[server] Listening on http://localhost:3001
```

## Summary

**Build Command:** `npm install` (NOT `npm install; npm run build`)
**Start Command:** `npm start`
**Root Directory:** `backend`

