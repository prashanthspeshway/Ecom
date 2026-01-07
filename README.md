# E-Commerce Platform - Savitri Saree Mandir

A full-stack e-commerce platform built with React (Frontend) and Node.js/Express (Backend).

## Production URLs
- **Frontend:** https://ecom.speshwayhrms.com
- **Backend API:** https://ecomb.speshwayhrms.com

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- MongoDB (optional, file-based storage available)

### Development Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd Ecom
```

2. **Backend Setup**
```bash
cd backend
npm install
cp env.example .env
# Edit .env with your configuration
npm start
```

3. **Frontend Setup**
```bash
cd frontend
npm install
npm run dev
```

Frontend will run on http://localhost:8080  
Backend will run on http://localhost:3001

## Production Deployment

### AWS Deployment Configuration

**Frontend:** https://ecom.speshwayhrms.com  
**Backend:** https://ecomb.speshwayhrms.com

See detailed deployment guides:
- [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md) - Step-by-step production setup
- [DEPLOYMENT_CONFIG.md](./DEPLOYMENT_CONFIG.md) - Complete configuration reference
- [AWS_DEPLOYMENT_FIX.md](./AWS_DEPLOYMENT_FIX.md) - AWS-specific troubleshooting

### Quick Production Setup

**Frontend Environment (`frontend/.env`):**
```env
VITE_API_BASE_URL=https://ecomb.speshwayhrms.com
```

**Backend Environment (`backend/.env`):**
```env
NODE_ENV=production
FRONTEND_URL=https://ecom.speshwayhrms.com
ALLOWED_ORIGINS=https://ecom.speshwayhrms.com,https://www.ecom.speshwayhrms.com
PUBLIC_BASE_URL=https://ecomb.speshwayhrms.com
```

## Features

- Product Management
- Shopping Cart
- User Authentication
- Order Management
- Payment Integration (Razorpay)
- Admin Dashboard
- Blog System
- Static Pages (About Us, Contact, Policies)
- Shipping Charge Management (State & City based)

## Project Structure

```
Ecom/
├── frontend/          # React frontend application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── lib/
│   └── public/
├── backend/           # Node.js/Express backend
│   ├── routes/
│   ├── data/
│   └── uploads/
└── docs/              # Documentation files
```

## Environment Variables

### Frontend (`frontend/.env`)
- `VITE_API_BASE_URL` - Backend API URL (production: https://ecomb.speshwayhrms.com)
- `VITE_APP_NAME` - Application name

### Backend (`backend/.env`)
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (production/development)
- `FRONTEND_URL` - Frontend URL for CORS (production: https://ecom.speshwayhrms.com)
- `ALLOWED_ORIGINS` - Comma-separated allowed origins
- `JWT_SECRET` - Secret for JWT tokens
- `ADMIN_INVITE_CODE` - Code for admin registration
- `MONGO_URI` - MongoDB connection string (optional)
- `SMTP_*` - SMTP configuration for emails
- `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` - Payment gateway credentials

See `frontend/env.example` and `backend/env.example` for complete examples.

## API Endpoints

- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user
- `GET /api/cart` - Get user cart
- `POST /api/orders` - Create order
- `GET /api/settings` - Get site settings
- And more...

## Documentation

- [PRODUCTION_SETUP.md](./PRODUCTION_SETUP.md) - Production deployment guide
- [DEPLOYMENT_CONFIG.md](./DEPLOYMENT_CONFIG.md) - Configuration reference
- [AWS_DEPLOYMENT_FIX.md](./AWS_DEPLOYMENT_FIX.md) - AWS troubleshooting
- [ENV_SETUP.md](./ENV_SETUP.md) - Environment variables guide

## License

Private - All rights reserved
