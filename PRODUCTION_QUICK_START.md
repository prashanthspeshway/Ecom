# Production Quick Start

## Quick Configuration Checklist

### Frontend (`frontend/.env`)

```env
VITE_APP_NAME=Saree Elegance
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_API_BASE=/api
VITE_BASE_URL=/
VITE_RAZORPAY_KEY_ID=your-razorpay-key-id
```

**Key Points:**
- Set `VITE_API_BASE_URL` to your backend API URL (no trailing slash)
- Leave empty for development (uses Vite proxy)
- All variables must start with `VITE_`

### Backend (`backend/.env`)

```env
# Server
PORT=3001
NODE_ENV=production

# Database
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/ecom
DB_NAME=ecom

# Security (CRITICAL!)
JWT_SECRET=<generate-32-char-random-string>
ADMIN_INVITE_CODE=<generate-secure-code>

# URLs
FRONTEND_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
PUBLIC_BASE_URL=https://yourdomain.com

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com

# Payments
RAZORPAY_KEY_ID=your-live-key-id
RAZORPAY_KEY_SECRET=your-live-key-secret
```

## Generate Secrets

```bash
# JWT Secret (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Admin Code
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

## Build & Deploy

```bash
# Frontend
cd frontend
npm install
npm run build
# Deploy frontend/dist/ to your hosting

# Backend
cd backend
npm install
# Use PM2 or systemd to run: node index.js
```

## API Endpoints

- **Frontend**: `https://yourdomain.com`
- **Backend API**: `https://api.yourdomain.com` (or same domain with `/api` path)
- **Uploads**: `https://yourdomain.com/uploads` (or S3 URLs)

## CORS Configuration

Backend automatically allows:
- `FRONTEND_URL` from environment
- Origins in `ALLOWED_ORIGINS` (comma-separated)
- Development origins (localhost) when `NODE_ENV !== "production"`

## Important Notes

1. **Never commit `.env` files** - They contain secrets
2. **Use strong secrets** - Generate random strings for JWT_SECRET
3. **Use HTTPS** - Required for production
4. **Use live Razorpay keys** - Test keys won't work in production
5. **Configure CORS properly** - Add all your frontend domains

For detailed setup, see `PRODUCTION_SETUP.md`
