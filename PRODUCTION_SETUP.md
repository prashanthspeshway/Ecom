# Production Setup Guide

This guide will help you deploy your E-commerce application to production.

## Prerequisites

- Node.js 18+ installed
- MongoDB database (optional, can use file-based storage)
- Domain name with SSL certificate
- SMTP email service credentials
- Razorpay account (for payments)
- AWS S3 account (optional, for file storage)

## Step 1: Environment Variables

### Frontend Environment Variables

Create `frontend/.env` from `frontend/.env.example`:

```env
VITE_APP_NAME=Saree Elegance
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_API_BASE=/api
VITE_BASE_URL=/
VITE_RAZORPAY_KEY_ID=your-razorpay-key-id
```

**Important:**
- `VITE_API_BASE_URL` should be your backend API URL (e.g., `https://api.yourdomain.com`)
- Do NOT include trailing slash
- All variables must start with `VITE_` to be accessible in the browser

### Backend Environment Variables

Create `backend/.env` from `backend/.env.example`:

```env
# Server
PORT=3001
NODE_ENV=production

# Database
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/ecom
DB_NAME=ecom

# Security (IMPORTANT: Generate a strong secret!)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
ADMIN_INVITE_CODE=your-secure-admin-code

# URLs
FRONTEND_URL=https://yourdomain.com
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
PUBLIC_BASE_URL=https://yourdomain.com

# SMTP (Email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com

# Razorpay (Payments)
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret

# AWS S3 (Optional - for file storage)
S3_BUCKET=your-bucket-name
S3_REGION=ap-south-1
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
```

## Step 2: Generate Secure Secrets

### Generate JWT Secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and use it as your `JWT_SECRET`.

### Generate Admin Invite Code

Use a strong, random string for `ADMIN_INVITE_CODE`:

```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

## Step 3: Build Frontend

```bash
cd frontend
npm install
npm run build
```

The build output will be in `frontend/dist/` directory.

## Step 4: Deploy Backend

### Option A: Using PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start backend
cd backend
npm install
pm2 start index.js --name ecom-backend

# Save PM2 configuration
pm2 save
pm2 startup
```

### Option B: Using systemd (Linux)

Create `/etc/systemd/system/ecom-backend.service`:

```ini
[Unit]
Description=E-commerce Backend
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node index.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable ecom-backend
sudo systemctl start ecom-backend
```

## Step 5: Deploy Frontend

### Option A: Using Nginx

1. Install Nginx
2. Copy `frontend/dist/` to `/var/www/yourdomain.com`
3. Create Nginx configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;
    
    root /var/www/yourdomain.com;
    index index.html;
    
    # Frontend
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API Proxy (if backend is on same server)
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
    
    # Uploads
    location /uploads {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Option B: Using Vercel/Netlify

1. Connect your repository
2. Set build command: `cd frontend && npm install && npm run build`
3. Set output directory: `frontend/dist`
4. Add environment variables in the platform dashboard
5. Deploy

## Step 6: SSL Certificate

Use Let's Encrypt (free):

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## Step 7: Database Setup

### MongoDB Atlas (Cloud)

1. Create account at https://www.mongodb.com/cloud/atlas
2. Create cluster
3. Create database user
4. Whitelist your server IP
5. Get connection string and add to `MONGO_URI`

### Local MongoDB

```bash
# Install MongoDB
sudo apt install mongodb

# Start MongoDB
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Update MONGO_URI in backend/.env
MONGO_URI=mongodb://localhost:27017/ecom
```

## Step 8: Verify Deployment

1. **Frontend**: Visit `https://yourdomain.com`
2. **Backend API**: Test `https://api.yourdomain.com/api/products`
3. **Health Check**: Create a simple endpoint to verify backend is running

## Step 9: Security Checklist

- [ ] Strong `JWT_SECRET` (32+ characters)
- [ ] Strong `ADMIN_INVITE_CODE`
- [ ] SSL certificate installed
- [ ] CORS properly configured
- [ ] Environment variables secured (not in git)
- [ ] Database credentials secured
- [ ] SMTP credentials secured
- [ ] Razorpay keys secured
- [ ] Firewall configured (only allow 80, 443, and backend port)
- [ ] Regular backups configured

## Step 10: Monitoring

### PM2 Monitoring

```bash
pm2 monit
pm2 logs ecom-backend
```

### Logs

- Backend logs: Check PM2 logs or systemd journal
- Frontend logs: Check browser console and server logs
- Nginx logs: `/var/log/nginx/access.log` and `/var/log/nginx/error.log`

## Troubleshooting

### CORS Errors

- Verify `ALLOWED_ORIGINS` includes your frontend URL
- Check `FRONTEND_URL` matches your actual frontend URL
- Ensure backend CORS configuration is correct

### API Not Working

- Verify `VITE_API_BASE_URL` is set correctly
- Check backend is running and accessible
- Verify firewall allows connections
- Check backend logs for errors

### Images Not Loading

- Verify `PUBLIC_BASE_URL` is set
- Check S3 configuration if using S3
- Verify file upload permissions

### Payments Not Working

- Verify Razorpay keys are correct (use live keys in production)
- Check Razorpay webhook configuration
- Verify payment endpoints are accessible

## Support

For issues, check:
1. Backend logs
2. Frontend browser console
3. Network tab in browser DevTools
4. Server logs (Nginx, PM2, etc.)
