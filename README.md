# TicketHub - Unified Ticketing Platform

A comprehensive e-ticketing system for booking movies, buses, events, and tours.

## Features

- **Multi-category Booking**: Movies, Buses, Events, Tours
- **Real-time Seat Selection**: Interactive seat maps for movies and buses
- **Secure Payments**: Razorpay integration with multiple payment methods
- **Wallet System**: Prepaid wallet for quick payments
- **Admin Dashboard**: Complete management system
- **Responsive Design**: Mobile-first approach
- **Real-time Notifications**: Booking and payment alerts

## Tech Stack

### Frontend
- React 18 with Vite
- Tailwind CSS for styling
- Framer Motion for animations
- React Query for state management
- React Router for navigation

### Backend
- Node.js with Express
- MongoDB with Mongoose
- JWT for authentication
- Razorpay for payments
- bcryptjs for password hashing

## Getting Started

### Prerequisites
- Node.js 16+
- MongoDB
- Razorpay account

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd unified-ticketing-platform
```

2. **Install dependencies**
```bash
cd backend && npm install
cd ../ && npm install
```

### Environment Variables

Create a `backend/.env` file with the following values:

```
MONGODB_URI=mongodb://localhost:27017/tickethub
JWT_SECRET=change-me
JWT_EXPIRES_IN=30d

RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your_secret
# Set to true to bypass Razorpay verification in local/dev
RAZORPAY_MOCK=true

OMDB_API_KEY=your_omdb_api_key
EMAIL_USER=no-reply@tickethub.com
EMAIL_PASSWORD=app_password
FRONTEND_URL=http://localhost:3000
```

For the frontend, create a `.env` (or `.env.local`) in the project root:

```
VITE_API_URL=http://localhost:5000/api
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxx
```

- **Local / Dev testing**: set `RAZORPAY_MOCK=true` (or leave the Razorpay keys blank). Payments and wallet recharges will run in a mocked mode without needing live credentials.
- **Production / Real payments**: provide live `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`, set `RAZORPAY_MOCK=false`, and make sure the same key is present in the frontend `.env`.