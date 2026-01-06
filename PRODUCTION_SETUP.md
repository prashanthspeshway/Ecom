# Production Setup Guide

## URLs Configuration
- **Frontend:** https://ecom.speshwayhrms.com
- **Backend:** https://ecomb.speshwayhrms.com

## Quick Setup

### Frontend Setup

1. **Create `frontend/.env` file:**
```env
VITE_APP_NAME=Saree Elegance
VITE_API_BASE_URL=https://ecomb.speshwayhrms.com
VITE_API_BASE=/api
VITE_BASE_URL=/
```

2. **Build frontend:**
```bash
cd frontend
npm install
npm run build
```

3. **Deploy `frontend/dist/` to https://ecom.speshwayhrms.com**

### Backend Setup

1. **Create `backend/.env` file:**
```env
NODE_ENV=production
PORT=3001

FRONTEND_URL=https://ecom.speshwayhrms.com
ALLOWED_ORIGINS=https://ecom.speshwayhrms.com,https://www.ecom.speshwayhrms.com
PUBLIC_BASE_URL=https://ecomb.speshwayhrms.com

# Generate these using the commands below
JWT_SECRET=<generate-32-char-random-string>
ADMIN_INVITE_CODE=<generate-secure-code>

# Optional - for MongoDB
MONGO_URI=
DB_NAME=ecom

# SMTP (for password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com

# Razorpay (for payments)
RAZORPAY_KEY_ID=your-live-key-id
RAZORPAY_KEY_SECRET=your-live-key-secret
```

2. **Generate Secrets:**
```bash
# JWT Secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Admin Invite Code
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

3. **Start backend:**
```bash
cd backend
npm install
# Use PM2 or systemd
pm2 start index.js --name ecom-backend
```

## Verification

### Test Backend
```bash
curl https://ecomb.speshwayhrms.com/api/products
# Should return JSON array
```

### Test Frontend
1. Open https://ecom.speshwayhrms.com
2. Open DevTools (F12) → Network tab
3. Try to login or load products
4. Verify API calls go to: `https://ecomb.speshwayhrms.com/api/...`
5. Check Console for errors

## Important Notes

1. **Environment Variables:**
   - Frontend `.env` must be set **before** building
   - Backend `.env` is read at runtime
   - Always rebuild frontend after changing `VITE_API_BASE_URL`

2. **CORS:**
   - Backend must allow frontend origin
   - Check `ALLOWED_ORIGINS` includes `https://ecom.speshwayhrms.com`
   - Restart backend after changing CORS settings

3. **HTTPS:**
   - Both frontend and backend must use HTTPS
   - SSL certificates must be valid
   - No mixed content (HTTP/HTTPS) issues

## Troubleshooting

### API calls fail with 405 or CORS error
- Verify `VITE_API_BASE_URL=https://ecomb.speshwayhrms.com` in frontend `.env`
- Verify `FRONTEND_URL=https://ecom.speshwayhrms.com` in backend `.env`
- Rebuild frontend and restart backend

### Network errors
- Check if backend is accessible: `curl https://ecomb.speshwayhrms.com/api/products`
- Verify SSL certificates are valid
- Check firewall/security group rules
