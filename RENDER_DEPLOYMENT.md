# Render Deployment Guide for Backend

This guide will help you deploy your backend to Render.com.

## Prerequisites

1. A Render.com account (sign up at https://render.com)
2. MongoDB Atlas database configured
3. AWS S3 bucket configured (for image uploads)
4. SMTP credentials (for email functionality)

## Deployment Steps

### Option 1: Using render.yaml (Recommended)

1. **Connect your GitHub repository to Render:**
   - Go to https://dashboard.render.com
   - Click "New +" → "Web Service"
   - Connect your GitHub repository (`prashanthspeshway/Ecom`)
   - Render will detect the `render.yaml` file automatically

2. **Configure the service:**
   - **Name**: `ecom-backend` (or your preferred name)
   - **Root Directory**: `backend` (important!)
   - **Environment**: `Node`
   - **Build Command**: `npm install` (runs in backend directory)
   - **Start Command**: `npm start` (runs in backend directory)

3. **Set Environment Variables:**
   Go to your service → Environment → Add the following:

   ```bash
   # General
   NODE_ENV=production
   PORT=3001

   # MongoDB
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
   DB_NAME=ecom

   # JWT Authentication
   JWT_SECRET=your-secret-key-here
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
   ```

4. **Deploy:**
   - Click "Create the service
   - Render will automatically build and deploy

### Option 2: Manual Configuration

If you prefer to configure manually:

1. **Create a new Web Service:**
   - Go to https://dashboard.render.com
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

2. **Configure Build Settings:**
   - **Name**: `ecom-backend`
   - **Root Directory**: `backend` ⚠️ **IMPORTANT: Set this to `backend`**
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

3. **Set Environment Variables** (same as Option 1)

4. **Deploy**

## Important Configuration Notes

### Root Directory
⚠️ **CRITICAL**: Make sure the **Root Directory** is set to `backend` in Render dashboard. This tells Render to run commands from the `backend/` directory where `package.json` with the `start` script is located.

### Port Configuration
- Render automatically sets the `PORT` environment variable
- Your backend code uses `process.env.PORT || 3001`
- No need to manually set PORT unless you want a specific value

### MongoDB Connection
- Ensure your MongoDB Atlas Network Access allows connections from Render's IP ranges (or use `0.0.0.0/0` for all IPs)
- Verify your connection string includes `?retryWrites=true&w=majority`

### File Uploads
- Since Render uses ephemeral storage, all file uploads should go to S3
- Ensure S3 credentials are correctly configured
- The backend automatically uses S3 if credentials are provided

## Post-Deployment Checklist

- [ ] Verify the service is running (check logs)
- [ ] Test health endpoint: `https://your-service.onrender.com/api/health`
- [ ] Test API endpoints (e.g., `/api/products`)
- [ ] Verify MongoDB connection (check logs for connection success)
- [ ] Test file uploads (should go to S3)
- [ ] Test authentication endpoints (`/api/auth/login`, `/api/auth/register`)
- [ ] Verify email functionality (password reset)

## Troubleshooting

### "Missing script: start" Error
- **Cause**: Root directory is not set to `backend`
- **Fix**: Go to Settings → Change Root Directory to `backend`

### Database Connection Failed
- Check MongoDB Atlas Network Access (whitelist Render IPs or use `0.0.0/0`)
- Verify `MONGO_URI` is correct
- Check database user permissions

### Build Fails
- Check build logs in Render dashboard
- Ensure all dependencies are in `backend/package.json`
- Verify Node.js version (Render uses Node 18.x by default)

### Port Already in Use
- Render automatically sets PORT, don't hardcode it
- Ensure your code uses `process.env.PORT`

### Environment Variables Not Working
- Double-check variable names (case-sensitive)
- Ensure variables are set in Render dashboard (not just in code)
- Restart the service after adding new variables

## Updating Frontend to Use Render Backend

After deploying to Render, update your frontend's API base URL:

1. **In Vercel Dashboard** (for frontend):
   - Go to your frontend project → Settings → Environment Variables
   - Add/Update: `VITE_API_BASE_URL=https://your-backend-service.onrender.com`

2. **Or update `frontend/vite.config.ts`:**
   ```typescript
   const apiTarget = env.VITE_API_BASE_URL || "https://your-backend-service.onrender.com";
   ```

3. **Or update `frontend/src/lib/auth.ts`:**
   ```typescript
   export const apiBase = import.meta.env.VITE_API_BASE_URL || "https://your-backend-service.onrender.com";
   ```

## Render Service URL

After deployment, Render will provide a URL like:
- `https://ecom-backend-xxxx.onrender.com`

Use this URL as your backend API base URL in the frontend configuration.

## Support

For issues:
1. Check Render service logs
2. Check MongoDB Atlas logs
3. Verify all environment variables are set
4. Review Render documentation: https://render.com/docs

