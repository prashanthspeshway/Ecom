# Vercel Deployment Guide

This guide will help you deploy your e-commerce application to Vercel.

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. MongoDB Atlas database configured
3. AWS S3 bucket configured (for image uploads)
4. SMTP credentials (for email functionality)

## Deployment Steps

### 1. Install Vercel CLI (Optional but Recommended)

```bash
npm i -g vercel
```

### 2. Configure Environment Variables

Before deploying, you need to set up environment variables in Vercel:

#### Required Environment Variables:

```bash
# MongoDB
MONGO_URI=mongodb+srv://ecommerce:12345@cluster0.khakamc.mongodb.net/?appName=Cluster0
DB_NAME=ecom

# JWT Authentication
JWT_SECRET=your-secret-key-here

# Admin Access
ADMIN_INVITE_CODE=ADMIN123

# AWS S3 (for file uploads)
S3_BUCKET=your-bucket-name
S3_REGION=ap-south-1
S3_ACCESS_KEY_ID=your-access-key-id
S3_SECRET_ACCESS_KEY=your-secret-access-key

# Razorpay (for payments)
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret

# SMTP (for email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourapp.com

# Public URL (will be set automatically by Vercel)
PUBLIC_BASE_URL=https://your-app.vercel.app
```

### 3. Deploy via Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your Git repository
3. Configure the project:
   - **Framework Preset**: Other
   - **Root Directory**: Leave as root (`.`)
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Output Directory**: `frontend/dist`
   - **Install Command**: `npm install` (runs in root)

4. Add all environment variables from step 2

5. Click "Deploy"

### 4. Deploy via CLI (Alternative)

```bash
# Login to Vercel
vercel login

# Deploy
vercel

# For production deployment
vercel --prod
```

### 5. Configure Build Settings

In Vercel dashboard, go to Project Settings → Build & Development Settings:

- **Build Command**: `cd frontend && npm install && npm run build`
- **Output Directory**: `frontend/dist`
- **Install Command**: `npm install`

### 6. API Routes Configuration

The backend is configured to run as Vercel serverless functions:
- All `/api/*` routes are handled by `api/index.js`
- The Express app is wrapped for serverless execution

### 7. File Uploads

Since Vercel serverless functions are stateless:
- File uploads are stored in AWS S3 (configured via environment variables)
- Local uploads directory is not persistent
- Ensure S3 credentials are properly configured

### 8. Database Migration

On first deployment, the app will automatically:
- Connect to MongoDB
- Create all collections with indexes
- Migrate data from JSON files (if collections are empty)

### 9. Post-Deployment Checklist

- [ ] Verify API endpoints are working (`/api/health`)
- [ ] Test user registration and login
- [ ] Verify file uploads to S3
- [ ] Check MongoDB collections are created
- [ ] Test admin panel access
- [ ] Verify email functionality (password reset)

### 10. Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update `PUBLIC_BASE_URL` environment variable

## Troubleshooting

### Build Fails

- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version (Vercel uses Node 18.x by default)

### API Routes Not Working

- Check that `api/index.js` exists
- Verify environment variables are set
- Check function logs in Vercel dashboard

### Database Connection Issues

- Verify `MONGO_URI` is correct
- Check MongoDB Atlas Network Access (IP whitelist)
- Ensure database user has proper permissions

### File Uploads Not Working

- Verify S3 credentials are correct
- Check S3 bucket permissions
- Verify bucket region matches `S3_REGION`

## Project Structure

```
.
├── api/
│   └── index.js          # Vercel serverless function entry
├── backend/
│   ├── index.js          # Express app (exported)
│   ├── routes/           # API routes
│   └── data/             # JSON data files (for migration)
├── frontend/
│   ├── src/              # React source code
│   ├── dist/             # Build output
│   └── vercel.json       # Frontend Vercel config
├── vercel.json           # Root Vercel config
└── .vercelignore        # Files to ignore
```

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGO_URI` | MongoDB connection string | Yes |
| `DB_NAME` | Database name | Yes |
| `JWT_SECRET` | Secret for JWT tokens | Yes |
| `ADMIN_INVITE_CODE` | Code for admin registration | Yes |
| `S3_BUCKET` | AWS S3 bucket name | Yes |
| `S3_REGION` | AWS S3 region | Yes |
| `S3_ACCESS_KEY_ID` | AWS access key | Yes |
| `S3_SECRET_ACCESS_KEY` | AWS secret key | Yes |
| `RAZORPAY_KEY_ID` | Razorpay key ID | Yes |
| `RAZORPAY_KEY_SECRET` | Razorpay secret | Yes |
| `SMTP_HOST` | SMTP server host | Yes |
| `SMTP_PORT` | SMTP port | Yes |
| `SMTP_USER` | SMTP username | Yes |
| `SMTP_PASS` | SMTP password | Yes |
| `SMTP_FROM` | Email sender address | Yes |
| `PUBLIC_BASE_URL` | Public app URL | Auto-set by Vercel |

## Support

For issues:
1. Check Vercel function logs
2. Check MongoDB Atlas logs
3. Verify all environment variables
4. Review build logs in Vercel dashboard

