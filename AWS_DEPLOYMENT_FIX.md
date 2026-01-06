# AWS Deployment Configuration Fix

## Problem
Frontend was not connecting to backend in AWS deployment due to incorrect API URL handling.

## Solution Applied

### 1. Fixed API URL Building
- Created `getApiUrl()` helper function in `frontend/src/lib/auth.ts`
- Updated all API calls to use this helper function
- Ensures proper URL construction in production

### 2. Updated Files
All frontend files now use `getApiUrl()` instead of direct `apiBase` concatenation:
- `frontend/src/lib/auth.ts` - Core auth functions
- `frontend/src/lib/api.ts` - API utilities
- `frontend/src/pages/*` - All page components
- `frontend/src/components/*` - All components

### 3. Backend CORS Improvements
- Enhanced CORS configuration to properly handle production domains
- Added logging for blocked origins
- Better environment variable handling

## Required Configuration for AWS Deployment

### Frontend Environment Variables (`frontend/.env`)

**CRITICAL:** Set `VITE_API_BASE_URL` to your backend URL:

```env
VITE_API_BASE_URL=https://ecom.speshwayhrms.com
# OR if backend is on different subdomain:
VITE_API_BASE_URL=https://api.speshwayhrms.com
# OR if backend is on different port:
VITE_API_BASE_URL=https://ecom.speshwayhrms.com:3001
```

**Important Notes:**
- ✅ **DO** include the protocol (`https://`)
- ✅ **DO** include the domain
- ❌ **DON'T** include trailing slash (`/`)
- ❌ **DON'T** include `/api` path (it's added automatically)

### Backend Environment Variables (`backend/.env`)

```env
NODE_ENV=production
PORT=3001

# Frontend URL (for CORS)
FRONTEND_URL=https://ecom.speshwayhrms.com

# Allowed CORS Origins (comma-separated, no spaces after commas)
ALLOWED_ORIGINS=https://ecom.speshwayhrms.com,https://www.ecom.speshwayhrms.com

# Other required variables...
JWT_SECRET=your-secret-here
ADMIN_INVITE_CODE=your-code-here
```

## Deployment Steps

### 1. Build Frontend
```bash
cd frontend
npm install
# Set VITE_API_BASE_URL in .env file
npm run build
# Deploy frontend/dist/ to your hosting (S3, CloudFront, etc.)
```

### 2. Deploy Backend
```bash
cd backend
npm install
# Set all environment variables in .env file
# Use PM2 or systemd to run:
node index.js
```

### 3. Verify Configuration

**Test Backend:**
```bash
curl https://ecom.speshwayhrms.com/api/products
# Should return JSON, not error
```

**Test Frontend:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Try to login or load products
4. Check if API requests are going to correct URL
5. Check for CORS errors in Console tab

## Common Issues & Solutions

### Issue: 405 Method Not Allowed
**Cause:** Request reaching wrong endpoint or CORS blocking
**Solution:** 
- Verify `VITE_API_BASE_URL` is set correctly
- Check backend CORS includes frontend domain
- Ensure backend is running and accessible

### Issue: CORS Error
**Cause:** Backend not allowing frontend origin
**Solution:**
- Add frontend domain to `ALLOWED_ORIGINS` in backend `.env`
- Restart backend server
- Check browser console for exact origin being blocked

### Issue: Network Error / Failed to Fetch
**Cause:** Backend not accessible or wrong URL
**Solution:**
- Verify backend is running: `curl https://your-backend-url/api/products`
- Check `VITE_API_BASE_URL` matches actual backend URL
- Ensure no firewall blocking requests

### Issue: 404 Not Found
**Cause:** Wrong API path or backend route not registered
**Solution:**
- Verify backend routes are registered in `backend/index.js`
- Check API path matches backend route structure
- Ensure backend is serving on correct port/path

## Testing Checklist

- [ ] `VITE_API_BASE_URL` is set in frontend `.env`
- [ ] Frontend is rebuilt after setting environment variable
- [ ] Backend `.env` has `FRONTEND_URL` set
- [ ] Backend `.env` has `ALLOWED_ORIGINS` set
- [ ] Backend server is running and accessible
- [ ] CORS allows frontend domain
- [ ] API endpoints respond correctly
- [ ] Login works
- [ ] Products load
- [ ] Cart functions work
- [ ] Checkout works

## Debugging

### Check Browser Console
1. Open DevTools (F12)
2. Check Console for errors
3. Check Network tab for failed requests
4. Look at request URL - should include full backend URL if `VITE_API_BASE_URL` is set

### Check Backend Logs
```bash
# If using PM2
pm2 logs

# If using systemd
journalctl -u your-service-name -f

# Direct node
# Check console output for CORS warnings
```

### Verify Environment Variables
```bash
# Frontend (check build output)
# Environment variables are baked into build, so rebuild after changes

# Backend
node -e "console.log(process.env.FRONTEND_URL)"
node -e "console.log(process.env.ALLOWED_ORIGINS)"
```

## Notes

- Environment variables must be set **before** building frontend
- Frontend environment variables are baked into the build
- Backend environment variables are read at runtime
- Always rebuild frontend after changing `VITE_API_BASE_URL`
- Restart backend after changing CORS settings

