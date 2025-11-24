# Environment Variables Reference

## Quick Setup

Copy the example files and fill in your values:

### Frontend (`frontend/.env`)
```env
VITE_API_BASE_URL=http://localhost:3001
VITE_GOOGLE_CLIENT_ID=187428957013-97eqd6kdb9tol67u9ddmpf535b18nv7m.apps.googleusercontent.com
```

### Backend (`backend/.env`)
```env
PORT=3001
MONGODB_URI=mongodb+srv://superuser:superuser123@cluster0.s3aalbl.mongodb.net/
DB_NAME=fintrackr
PDF_COLLECTION_NAME=pdf_files
```

---

## Frontend Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API URL | `http://localhost:3001` or `https://api.yourdomain.com` |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth Client ID | `xxx.apps.googleusercontent.com` |

**Note:** All frontend variables must be prefixed with `VITE_` to be accessible in the browser.

---

## Backend Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `PORT` | Server port | `3001` | `3001` |
| `MONGODB_URI` | MongoDB connection string | (required) | `mongodb+srv://user:pass@cluster.mongodb.net/` |
| `DB_NAME` | Database name | `fintrackr` | `fintrackr` |
| `PDF_COLLECTION_NAME` | PDF collection name | `pdf_files` | `pdf_files` |
`FRONTEND_URL` = VITE FRONTEND URL;

---

## For Production Deployment

### Vercel (Frontend)
1. Go to Project Settings → Environment Variables
2. Add:
   - `VITE_API_BASE_URL` = Your backend URL
   - `VITE_GOOGLE_CLIENT_ID` = Your Google Client ID

### Railway/Render/Heroku (Backend)
1. Go to your project settings
2. Add environment variables:
   - `PORT` = (usually auto-set by platform)
   - `MONGODB_URI` = Your MongoDB connection string
   - `DB_NAME` = `fintrackr`
   - `PDF_COLLECTION_NAME` = `pdf_files`

---

## Getting Your Values

### Google OAuth Client ID
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select a project
3. Enable Google+ API
4. Go to Credentials → Create OAuth 2.0 Client ID
5. Copy the Client ID

### MongoDB URI
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a cluster
3. Click "Connect" → "Connect your application"
4. Copy the connection string
5. Replace `<password>` with your database password

---

## Security Reminders

⚠️ **Never commit `.env` files!**

- Add `.env` to `.gitignore`
- Use environment variables in your hosting platform
- Keep secrets secure

