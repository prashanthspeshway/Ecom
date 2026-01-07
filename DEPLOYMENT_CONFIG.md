# Production Deployment Configuration

## URLs
- **Frontend:** https://ecom.speshwayhrms.com
- **Backend:** https://ecomb.speshwayhrms.com

## Frontend Configuration (`frontend/.env` or `frontend/.env.production`)

```env
VITE_APP_NAME=Saree Elegance
VITE_API_BASE_URL=https://ecomb.speshwayhrms.com
VITE_API_BASE=/api
VITE_BASE_URL=/
```

**Important:** 
- `VITE_API_BASE_URL` must be set to the backend URL: `https://ecomb.speshwayhrms.com`
- No trailing slash
- Must include `https://`

## Backend Configuration (`backend/.env`)

```env
NODE_ENV=production
PORT=3001

# Frontend URL for CORS
FRONTEND_URL=https://ecom.speshwayhrms.com

# Allowed CORS Origins (comma-separated, no spaces)
ALLOWED_ORIGINS=https://ecom.speshwayhrms.com,https://www.ecom.speshwayhrms.com

# Public Base URL (for file uploads)
PUBLIC_BASE_URL=https://ecomb.speshwayhrms.com

# Security (REQUIRED - Generate strong random strings)
JWT_SECRET=<generate-32-char-random-string>
ADMIN_INVITE_CODE=<generate-secure-code>

# Database (optional)
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

## Deployment Steps

### 1. Frontend Deployment

```bash
cd frontend

# Set environment variable
export VITE_API_BASE_URL=https://ecomb.speshwayhrms.com
# OR create .env file with the variable

# Install dependencies
npm install

# Build for production
npm run build

# Deploy frontend/dist/ to https://ecom.speshwayhrms.com
# (S3 + CloudFront, or your hosting solution)
```

### 2. Backend Deployment

```bash
cd backend

# Create .env file with all required variables
# (Copy from .env.production and fill in actual values)

# Install dependencies
npm install

# Start with PM2 or systemd
pm2 start index.js --name ecom-backend
# OR
systemctl start ecom-backend
```

### 3. Verify Configuration

**Test Backend:**
```bash
curl https://ecomb.speshwayhrms.com/api/products
# Should return JSON
```

**Test Frontend:**
1. Open https://ecom.speshwayhrms.com
2. Open browser DevTools (F12)
3. Check Network tab - API calls should go to `https://ecomb.speshwayhrms.com/api/...`
4. Check Console for errors

## Troubleshooting

### API Calls Going to Wrong URL
- Verify `VITE_API_BASE_URL=https://ecomb.speshwayhrms.com` in frontend `.env`
- Rebuild frontend after changing environment variables
- Clear browser cache

### CORS Errors
- Verify `FRONTEND_URL=https://ecom.speshwayhrms.com` in backend `.env`
- Verify `ALLOWED_ORIGINS` includes frontend domain
- Restart backend after changing CORS settings

### 405 Method Not Allowed
- Check if backend is accessible: `curl https://ecomb.speshwayhrms.com/api/products`
- Verify backend routes are registered
- Check backend logs for errors

## Environment Variable Generation

```bash
# Generate JWT Secret (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate Admin Invite Code
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```


