# Frontend-Backend Connection Guide

## Current Setup
- **Frontend**: Deployed on Vercel
- **Backend**: Deployed on Render at `https://ecom-cyav.onrender.com`

## Configuration Steps

### 1. Vercel Environment Variables
In your Vercel dashboard, make sure you have:
- `VITE_API_BASE_URL` = `https://ecom-cyav.onrender.com` (without trailing slash)

### 2. Render Environment Variables
In your Render dashboard, add:
- `FRONTEND_URL` = Your Vercel frontend URL (e.g., `https://ecom-xxxxx.vercel.app`)

### 3. Backend CORS
The backend is configured to allow:
- All Vercel URLs (`.vercel.app` domains)
- Your custom domain
- Localhost for development

### 4. How It Works
- Frontend reads `VITE_API_BASE_URL` from environment variables
- All API calls use `apiBase` + `/api/...` when `VITE_API_BASE_URL` is set
- Backend CORS allows requests from Vercel frontend

## Testing the Connection

1. **Check Backend Health:**
   ```
   https://ecom-cyav.onrender.com/api/health
   ```

2. **Test from Frontend:**
   - Open browser console
   - Check Network tab for API calls
   - They should go to `https://ecom-cyav.onrender.com/api/...`

## Troubleshooting

### CORS Errors
- Verify `FRONTEND_URL` is set in Render
- Check backend logs for CORS errors
- Ensure frontend URL matches exactly (including https://)

### API Calls Not Working
- Verify `VITE_API_BASE_URL` is set in Vercel
- Check browser console for errors
- Verify backend is running (check Render logs)

### Build Failures
- Check Vercel build logs
- Ensure `frontend/package.json` has all dependencies
- Verify build command: `cd frontend && npm install && npm run build`

