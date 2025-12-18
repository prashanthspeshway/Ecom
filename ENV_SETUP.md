# Environment Variables Setup

This project has **separate** environment variable files for the frontend and backend. They serve different purposes and should NOT be the same.

## Frontend (.env)

Located in: `frontend/.env`

**Frontend uses Vite**, which requires environment variables to be prefixed with `VITE_` to be accessible in the browser.

### Required Variables:
- `VITE_APP_NAME` - Application name
- `VITE_API_BASE_URL` - Leave empty for development (uses proxy), set backend URL for production
- `VITE_API_BASE` - API base path (usually `/api`)
- `VITE_BASE_URL` - Base URL for the app (usually `/`)

### Example:
```env
VITE_APP_NAME=Saree Elegance
VITE_API_BASE_URL=
VITE_API_BASE=/api
VITE_BASE_URL=/
```

## Backend (.env)

Located in: `backend/.env`

**Backend uses Node.js**, which uses standard `process.env` variables (no prefix needed).

### Required Variables:
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment mode (`development` or `production`)
- `MONGO_URI` - MongoDB connection string (optional - leave empty for file-based storage)
- `DB_NAME` - Database name (default: ecom)
- `JWT_SECRET` - Secret for JWT token signing (CHANGE IN PRODUCTION! Use 32+ character random string)
- `ADMIN_INVITE_CODE` - Code users enter during registration to become admin
- `PUBLIC_BASE_URL` - Public base URL for file uploads (optional)
- `FRONTEND_URL` - Frontend URL for CORS and password reset links
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins (optional, defaults to FRONTEND_URL)
- `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` - AWS S3 config (optional)

### SMTP Configuration (for Password Reset):
- `SMTP_HOST` - SMTP server hostname (e.g., `smtp.gmail.com`)
- `SMTP_PORT` - SMTP server port (default: 587)
- `SMTP_SECURE` - Use secure connection (`true` or `false`, default: `false`)
- `SMTP_USER` - SMTP username/email
- `SMTP_PASS` - SMTP password or app password
- `SMTP_FROM` - From email address (optional, defaults to SMTP_USER)
- `FRONTEND_URL` - Frontend URL for reset links (default: `http://localhost:8080`)

### Razorpay Configuration (for Payment Gateway):
- `RAZORPAY_KEY_ID` - Your Razorpay Key ID (from Razorpay Dashboard)
- `RAZORPAY_KEY_SECRET` - Your Razorpay Key Secret (from Razorpay Dashboard)

### Development Example:
```env
PORT=3001
NODE_ENV=development
MONGO_URI=
DB_NAME=ecom
JWT_SECRET=dev-secret-change-in-production
ADMIN_INVITE_CODE=
PUBLIC_BASE_URL=
FRONTEND_URL=http://localhost:8080
ALLOWED_ORIGINS=http://localhost:8080,http://localhost:5173
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=

# SMTP Configuration (for password reset emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com

# Razorpay Configuration
RAZORPAY_KEY_ID=your-razorpay-test-key-id
RAZORPAY_KEY_SECRET=your-razorpay-test-key-secret
```

### Production Example:
```env
PORT=3001
NODE_ENV=production
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/ecom
DB_NAME=ecom
JWT_SECRET=your-super-secret-32-character-minimum-random-string
ADMIN_INVITE_CODE=your-secure-admin-code
PUBLIC_BASE_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
S3_BUCKET=your-production-bucket
S3_REGION=ap-south-1
S3_ACCESS_KEY_ID=your-production-access-key
S3_SECRET_ACCESS_KEY=your-production-secret-key

# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com

# Razorpay Configuration (use LIVE keys in production)
RAZORPAY_KEY_ID=your-razorpay-live-key-id
RAZORPAY_KEY_SECRET=your-razorpay-live-key-secret
```

**Note for Gmail users**: You need to use an [App Password](https://support.google.com/accounts/answer/185833) instead of your regular password. Enable 2-Step Verification first, then generate an app password.

**Note for Razorpay**: Get your Key ID and Key Secret from [Razorpay Dashboard](https://dashboard.razorpay.com/app/keys). Use test keys for development and live keys for production.

## Setup Instructions

1. **Frontend**: Copy `frontend/.env.example` to `frontend/.env` and update values
2. **Backend**: Copy `backend/.env.example` to `backend/.env` and update values

**Important**: 
- Frontend variables MUST start with `VITE_`
- Backend variables do NOT have a prefix
- These are DIFFERENT files with DIFFERENT variables
- Never copy one .env file to the other location
