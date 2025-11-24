# Deployment Guide for FinTrackr

This guide will help you deploy FinTrackr to Vercel (frontend) and other hosting platforms (backend).

## Prerequisites

- Node.js installed
- MongoDB Atlas account (or your own MongoDB instance)
- Google Cloud Console account (for OAuth)
- Git repository

---

## Environment Variables Setup

### Frontend Environment Variables

Create a `.env` file in the `frontend/` directory (or set these in your hosting platform):

```env
VITE_API_BASE_URL=https://your-backend-url.com
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

**Important:** In Vite, environment variables must be prefixed with `VITE_` to be exposed to the client.

### Backend Environment Variables

Create a `.env` file in the `backend/` directory (or set these in your hosting platform):

```env
PORT=3001
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
DB_NAME=fintrackr
PDF_COLLECTION_NAME=pdf_files
```

---

## Frontend Deployment (Vercel)

### Step 1: Prepare Your Frontend

1. Make sure all environment variables are set in Vercel:
   - Go to your project settings → Environment Variables
   - Add:
     - `VITE_API_BASE_URL` = Your backend URL
     - `VITE_GOOGLE_CLIENT_ID` = Your Google OAuth Client ID

### Step 2: Deploy to Vercel

**Option A: Using Vercel CLI**
```bash
cd frontend
npm install -g vercel
vercel
```

**Option B: Using GitHub Integration**
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Set the root directory to `frontend`
5. Add environment variables in the dashboard
6. Deploy

### Step 3: Configure Build Settings

- **Framework Preset:** Vite
- **Root Directory:** `frontend`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

---

## Backend Deployment Options

### Option 1: Railway

1. Go to [railway.app](https://railway.app)
2. Create a new project
3. Connect your GitHub repository
4. Add a new service → Select your backend folder
5. Add environment variables:
   - `PORT` (Railway will auto-assign, but you can set it)
   - `MONGODB_URI`
   - `DB_NAME`
   - `PDF_COLLECTION_NAME`
6. Deploy

### Option 2: Render

1. Go to [render.com](https://render.com)
2. Create a new Web Service
3. Connect your repository
4. Configure:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
5. Add environment variables
6. Deploy

### Option 3: Heroku

1. Install Heroku CLI
2. Login: `heroku login`
3. Create app: `heroku create your-app-name`
4. Set environment variables:
   ```bash
   heroku config:set MONGODB_URI=your-mongodb-uri
   heroku config:set DB_NAME=fintrackr
   heroku config:set PORT=3001
   ```
5. Deploy: `git push heroku main`

### Option 4: DigitalOcean App Platform

1. Go to DigitalOcean → App Platform
2. Create a new app from GitHub
3. Select backend folder
4. Configure:
   - **Build Command:** `npm install`
   - **Run Command:** `node server.js`
5. Add environment variables
6. Deploy

---

## Important Configuration Notes

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select a project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - For local: `http://localhost:5173` (or your Vite dev port)
   - For production: `https://your-frontend-domain.vercel.app`
6. Copy the Client ID to your frontend `.env`

### MongoDB Atlas Setup

1. Create a MongoDB Atlas account
2. Create a cluster
3. Create a database user
4. Whitelist your IP addresses (or use `0.0.0.0/0` for all IPs in production)
5. Get your connection string and add it to backend `.env`

### CORS Configuration

Make sure your backend allows requests from your frontend domain. Update `server.js` if needed:

```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
```

---

## Environment Variables Quick Reference

### Frontend (.env)
```
VITE_API_BASE_URL=https://your-backend.railway.app
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### Backend (.env)
```
PORT=3001
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/
DB_NAME=fintrackr
PDF_COLLECTION_NAME=pdf_files
FRONTEND_URL=https://your-frontend.vercel.app
```

---

## Testing Your Deployment

1. **Frontend:** Visit your Vercel URL
2. **Backend:** Test API endpoints:
   ```bash
   curl https://your-backend-url.com/api/transactions
   ```
3. **Full Flow:** Try logging in with Google OAuth

---

## Troubleshooting

### Frontend can't connect to backend
- Check `VITE_API_BASE_URL` is set correctly
- Verify backend CORS settings allow your frontend domain
- Check backend is running and accessible

### OAuth not working
- Verify `VITE_GOOGLE_CLIENT_ID` matches your Google Cloud Console
- Check authorized redirect URIs include your production domain
- Ensure OAuth consent screen is configured

### MongoDB connection issues
- Verify `MONGODB_URI` is correct
- Check IP whitelist in MongoDB Atlas
- Ensure database user has proper permissions

---

## Security Notes

⚠️ **Never commit `.env` files to Git!**

- Add `.env` to `.gitignore`
- Use `.env.example` files as templates
- Set environment variables in your hosting platform's dashboard
- Use secrets management for sensitive data

---

## Support

If you encounter issues:
1. Check the console logs (browser and server)
2. Verify all environment variables are set
3. Test API endpoints directly
4. Check CORS and network settings

