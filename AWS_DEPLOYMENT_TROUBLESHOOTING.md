# AWS Deployment Troubleshooting Guide

## Common Issues and Solutions

### Issue: Login and API Calls Not Working

#### 1. Check API Base URL Configuration

**Frontend Environment (`frontend/.env`):**
```env
VITE_API_BASE_URL=https://api.yourdomain.com
```

**Important:**
- `VITE_API_BASE_URL` should point to your **backend API server**, not the frontend
- If backend is on the same domain, use: `https://yourdomain.com` (without `/api`)
- If backend is on a subdomain, use: `https://api.yourdomain.com`
- **Do NOT include trailing slash**

**Example for your setup:**
- Frontend: `https://ecom.speshwayhrms.com`
- Backend: `https://ecomb.speshwayhrms.com`

```env
VITE_API_BASE_URL=https://ecomb.speshwayhrms.com
```

#### 2. Verify Backend is Running and Accessible

Test if backend is accessible:
```bash
curl https://ecomb.speshwayhrms.com/api/products
```

Should return JSON, not an error.

#### 3. Check CORS Configuration

**Backend Environment (`backend/.env`):**
```env
FRONTEND_URL=https://ecom.speshwayhrms.com
ALLOWED_ORIGINS=https://ecom.speshwayhrms.com,https://www.ecom.speshwayhrms.com
```

**Verify:**
- Backend CORS includes your frontend domain
- No trailing slashes in URLs
- HTTPS is used (not HTTP)

#### 4. Check Browser Console

Open browser DevTools (F12) and check:
- **Console tab**: Look for CORS errors, network errors
- **Network tab**: Check if API requests are being made and what the response is

Common errors:
- `CORS policy: No 'Access-Control-Allow-Origin'` → CORS misconfiguration
- `Failed to fetch` → Backend not accessible or wrong URL
- `404 Not Found` → Wrong API endpoint URL
- `401 Unauthorized` → Token issues

#### 5. Verify Backend Environment Variables

**Backend `.env` should have:**
```env
NODE_ENV=production
FRONTEND_URL=https://ecom.speshwayhrms.com
ALLOWED_ORIGINS=https://ecom.speshwayhrms.com,https://www.ecom.speshwayhrms.com
PUBLIC_BASE_URL=https://ecomb.speshwayhrms.com
PORT=3001
JWT_SECRET=<strong-secret>
```

#### 6. Check Security Groups (AWS EC2)

Ensure your EC2 security group allows:
- **Inbound**: Port 3001 (or your backend port) from your frontend server
- **Inbound**: Port 443 (HTTPS) for API access
- **Outbound**: All traffic (for API calls to external services)

#### 7. Check Nginx/Reverse Proxy Configuration

If using Nginx as reverse proxy, ensure:

```nginx
location /api {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

#### 8. Rebuild Frontend After Environment Changes

After changing `.env` file:
```bash
cd frontend
npm run build
# Redeploy the dist/ folder
```

**Important:** Environment variables are baked into the build at build time. You must rebuild after changing `.env`.

## Quick Diagnostic Steps

1. **Test Backend Directly:**
   ```bash
   curl https://ecomb.speshwayhrms.com/api/products
   ```

2. **Check Backend Logs:**
   ```bash
   # If using PM2
   pm2 logs ecom-backend
   
   # If using systemd
   journalctl -u ecom-backend -f
   ```

3. **Check Frontend Build:**
   - Open browser DevTools → Network tab
   - Try to login
   - Check what URL the login request is going to
   - Verify it matches your `VITE_API_BASE_URL`

4. **Verify Environment Variables:**
   ```bash
   # On frontend server
   cat frontend/.env
   
   # On backend server
   cat backend/.env
   ```

## Common Configuration Mistakes

1. **Wrong API URL:**
   - ❌ `VITE_API_BASE_URL=https://ecomb.speshwayhrms.com/api` (has `/api`)
   - ✅ `VITE_API_BASE_URL=https://ecomb.speshwayhrms.com`

2. **Trailing Slash:**
   - ❌ `VITE_API_BASE_URL=https://api.domain.com/`
   - ✅ `VITE_API_BASE_URL=https://api.domain.com`

3. **HTTP instead of HTTPS:**
   - ❌ `VITE_API_BASE_URL=http://api.domain.com`
   - ✅ `VITE_API_BASE_URL=https://api.domain.com`

4. **CORS Mismatch:**
   - Frontend at: `https://ecom.speshwayhrms.com`
   - Backend `ALLOWED_ORIGINS` must include: `https://ecom.speshwayhrms.com`

5. **Not Rebuilding After Env Changes:**
   - Must run `npm run build` after changing `.env` files

## Testing Checklist

- [ ] Backend is running and accessible
- [ ] `VITE_API_BASE_URL` points to backend (not frontend)
- [ ] Backend CORS includes frontend domain
- [ ] Frontend rebuilt after `.env` changes
- [ ] Security groups allow traffic
- [ ] Nginx/proxy configured correctly
- [ ] HTTPS certificates valid
- [ ] Browser console shows no CORS errors
