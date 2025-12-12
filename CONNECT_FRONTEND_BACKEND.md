# Connect Frontend (Vercel) to Backend (Render) - Step by Step

## Current Status
- ✅ **Frontend**: Deployed on Vercel at `ecommerce-alpha-three-84.vercel.app`
- ✅ **Backend**: Deployed on Render at `https://ecom-cyav.onrender.com`
- ⚠️ **Connection**: Needs to be configured

## Step 1: Set Environment Variable in Vercel

### Go to Vercel Dashboard:
1. Open: https://vercel.com/prashi4515-gmailcoms-projects/ecommerce/settings/environment-variables
2. Click **"+ Add Another"** button
3. Add the following:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `https://ecom-cyav.onrender.com` (NO trailing slash)
   - **Environment**: Select "Production", "Preview", and "Development" (or just "All Environments")
4. Click **"Save"**

### Verify it's set:
- You should see `VITE_API_BASE_URL` in the environment variables list
- Value should be: `https://ecom-cyav.onrender.com`

## Step 2: Add Frontend URL to Render (for CORS)

### Go to Render Dashboard:
1. Open: https://dashboard.render.com/web/srv-d4tap0euk2gs73empid0/environment
2. Click **"Edit"** button
3. Add a new environment variable:
   - **Key**: `FRONTEND_URL`
   - **Value**: `https://ecommerce-alpha-three-84.vercel.app`
4. Click **"Save Changes"**

## Step 3: Redeploy Both Services

### Vercel (Frontend):
1. Go to: https://vercel.com/prashi4515-gmailcoms-projects/ecommerce/deployments
2. Click **"Redeploy"** on the latest deployment
3. Or push a new commit to trigger auto-deploy

### Render (Backend):
1. Go to: https://dashboard.render.com/web/srv-d4tap0euk2gs73empid0
2. Click **"Manual Deploy"** → **"Deploy latest commit"**
3. Or the service will auto-restart when you save environment variables

## Step 4: Test the Connection

### Test Backend Health:
Open in browser: `https://ecom-cyav.onrender.com/api/health`
- Should return: `{"status":"ok","database":"connected",...}`

### Test from Frontend:
1. Open your Vercel frontend: `https://ecommerce-alpha-three-84.vercel.app`
2. Open browser DevTools (F12)
3. Go to **Network** tab
4. Try to login or browse products
5. Check the Network requests - they should go to:
   - `https://ecom-cyav.onrender.com/api/...`

### Expected Behavior:
- ✅ API calls go to Render backend
- ✅ No CORS errors in console
- ✅ Login/Register works
- ✅ Products load from backend
- ✅ Cart/Wishlist syncs with backend

## Troubleshooting

### If API calls still go to `/api/...` (relative):
- Check that `VITE_API_BASE_URL` is set correctly in Vercel
- Verify it's set for the correct environment (Production)
- Clear browser cache and hard refresh (Ctrl+Shift+R)

### If you see CORS errors:
- Verify `FRONTEND_URL` is set in Render
- Check backend logs for CORS messages
- Ensure the frontend URL matches exactly (including https://)

### If build fails:
- Check Vercel build logs
- Verify `VITE_API_BASE_URL` doesn't have trailing slash
- Ensure environment variable is set before build

## Quick Checklist

- [ ] `VITE_API_BASE_URL` set in Vercel = `https://ecom-cyav.onrender.com`
- [ ] `FRONTEND_URL` set in Render = `https://ecommerce-alpha-three-84.vercel.app`
- [ ] Frontend redeployed after setting environment variable
- [ ] Backend restarted after setting environment variable
- [ ] Tested API calls in browser DevTools
- [ ] No CORS errors in console
- [ ] Login/Register functionality works

## Code Changes Already Made

The following code changes are already in place:
- ✅ Frontend `auth.ts` uses `apiBase` for API calls
- ✅ Frontend `api.ts` uses `apiBase` for API calls
- ✅ Backend CORS allows Vercel domains
- ✅ `authFetch` prepends `apiBase` to relative URLs

You just need to set the environment variables and redeploy!

