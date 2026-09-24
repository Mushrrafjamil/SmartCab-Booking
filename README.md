# Cab Booking System

Full-stack cab booking application with **Next.js** frontend and **Express + MongoDB** backend.

## Quick Start

```bash
# Backend
cd backend
npm install
npm run seed          # Seed test data
npm run dev           # http://localhost:5000

# Frontend
cd frontend
npm install
npm run dev           # http://localhost:3000
```

## Test Accounts (after seed)


## Authentication Module

### Features Implemented

**User Registration**
- Full name, email, phone, password, profile photo upload
- Referral code, terms acceptance
- OTP verification (email + phone)
- Auto-generated user ID & referral code
- Password strength validation (bcrypt hashing)

**Driver Registration (7-step wizard)** — `/register/driver`
1. Personal details
2. Identity verification (Aadhaar, PAN + documents)
3. Driving license
4. Vehicle details
5. Vehicle documents (RC, insurance, pollution)
6. Profile, bank & emergency contact
7. Submit for admin review

**Login** — `/login`
- Email + password
- Phone + password
- OTP login

**Other Auth**
- Forgot / reset password with OTP — `/forgot-password`
- Email & phone OTP verification — `/verify-otp`
- JWT access + refresh tokens with rotation
- Session management — `/settings`
- Login history tracking
- Account lock after failed attempts
- Rate limiting on auth endpoints

**Admin Auth Controls** — `/admin/*`
- User search, suspend/activate, force logout
- Driver approve/reject/review with remarks
- Security, OTP & activity logs — `/admin/security`
- Soft delete & restore accounts

**Security**
- Helmet, CORS, mongo sanitization
- bcrypt password hashing (12 rounds)
- Hashed OTP storage
- Brute-force protection
- Role-based access (passenger, driver, admin, super_admin)

### Auth API Endpoints

```
POST /api/auth/register
POST /api/auth/register/driver/step/:step
POST /api/auth/login
POST /api/auth/login/otp
POST /api/auth/login/otp/verify
POST /api/auth/verify-otp
POST /api/auth/resend-otp
POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/auth/sessions
DELETE /api/auth/sessions/:id
GET  /api/auth/login-history
```

## Project Structure

```
college-project/
├── backend/src/
│   ├── controllers/   # authController, adminAuthController, ...
│   ├── models/        # User, Driver, Session, OtpVerification, ...
│   ├── routes/        # auth, admin, user, driver, ...
│   ├── middleware/    # auth, validate, upload, rateLimit
│   └── services/      # authService
└── frontend/src/
    ├── app/           # Pages (user, admin, driver, auth)
    ├── components/    # UI + auth components
    ├── services/      # API client
    └── lib/           # Validation helpers
```

## Environment

**backend/.env**
```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/cab-booking
JWT_SECRET=your_secret
JWT_REFRESH_SECRET=your_refresh_secret
FRONTEND_URL=http://localhost:3000
```

**frontend/.env.local**
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```
