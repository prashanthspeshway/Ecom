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
- `MONGO_URI` - MongoDB connection string (optional - leave empty for file-based storage)
- `DB_NAME` - Database name (default: ecom)
- `JWT_SECRET` - Secret for JWT token signing (CHANGE IN PRODUCTION!)
- `ADMIN_INVITE_CODE` - Code users enter during registration to become admin
- `PUBLIC_BASE_URL` - Public base URL for file uploads (optional)
- `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` - AWS S3 config (optional)

### Example:
```env
PORT=3001
MONGO_URI=
DB_NAME=ecom
JWT_SECRET=change-me-in-production-use-a-strong-random-string
ADMIN_INVITE_CODE=
PUBLIC_BASE_URL=
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
```

## Setup Instructions

1. **Frontend**: Copy `frontend/.env.example` to `frontend/.env` and update values
2. **Backend**: Copy `backend/.env.example` to `backend/.env` and update values

**Important**: 
- Frontend variables MUST start with `VITE_`
- Backend variables do NOT have a prefix
- These are DIFFERENT files with DIFFERENT variables
- Never copy one .env file to the other location
