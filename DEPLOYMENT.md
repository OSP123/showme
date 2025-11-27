# Deployment Guide

## Free Hosting Options

### Option 1: Railway.app (Recommended - Easiest)

Railway supports Docker Compose and has a generous free tier.

#### Steps:

1. **Sign up at [railway.app](https://railway.app)** (free tier: $5/month credit)

2. **Create a new project**:
   - Click "New Project"
   - Select "Deploy from GitHub repo" (or connect your Codeberg repo)
   - Select your `showme` repository

3. **Configure environment variables**:
   - In Railway dashboard, go to your service → Variables
   - Add these (Railway will auto-generate some):
     ```
     POSTGRES_USER=showme
     POSTGRES_PASSWORD=<generate-strong-password>
     POSTGRES_DB=showme
     DATABASE_URL=postgresql://showme:<password>@db:5432/showme?sslmode=disable
     PGRST_DB_URI=postgresql://showme:<password>@db:5432/showme
     PGRST_DB_SCHEMAS=public
     PGRST_DB_ANON_ROLE=showme
     ELECTRIC_INSECURE=true
     ```

4. **Deploy**:
   - Railway will detect `compose.yaml` and deploy all services
   - It will expose ports automatically
   - Get your public URL from the dashboard

5. **Update frontend environment**:
   - In Railway, find your `showme` service
   - Add environment variable:
     ```
     VITE_ELECTRIC_SHAPE_URL=https://your-railway-url.up.railway.app/v1/shape
     VITE_ELECTRIC_SOURCE_ID=dev-source-001
     ```
   - Rebuild the service

**Note**: Railway free tier sleeps after inactivity. Consider upgrading to Hobby ($5/month) for always-on.

---

### Option 2: Render.com

Render has a free tier but services sleep after 15 minutes of inactivity.

#### Steps:

1. **Sign up at [render.com](https://render.com)**

2. **Create a Blueprint** (for Docker Compose):
   - New → Blueprint
   - Connect your Git repository
   - Render will detect `compose.yaml`

3. **Configure services**:
   - Render will create services for each container
   - Set environment variables in each service
   - Free tier: Services sleep after 15 min (slow first request)

4. **Get public URLs**:
   - Each service gets a `*.onrender.com` URL
   - Update `VITE_ELECTRIC_SHAPE_URL` in frontend service

---

### Option 3: Fly.io

Fly.io has a generous free tier with 3 shared VMs.

#### Steps:

1. **Install Fly CLI**:
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Sign up and login**:
   ```bash
   fly auth signup
   fly auth login
   ```

3. **Create `fly.toml`** (for Docker Compose conversion):
   - Fly.io doesn't directly support Docker Compose
   - You'll need to convert services to Fly apps
   - Or use `flyctl deploy` with a Dockerfile

4. **Deploy**:
   ```bash
   fly launch  # Follow prompts
   ```

**Note**: More complex setup, but good free tier.

---

### Option 4: Split Deployment (Frontend + Backend)

Host frontend separately for better performance.

#### Frontend: Vercel/Netlify (Free)

1. **Build the frontend**:
   ```bash
   cd client
   npm run build
   ```

2. **Deploy to Vercel**:
   - Sign up at [vercel.com](https://vercel.com)
   - Import your Git repository
   - Set root directory to `client`
   - Build command: `npm run build`
   - Output directory: `dist`
   - Add environment variables:
     ```
     VITE_ELECTRIC_SHAPE_URL=https://your-backend-url/v1/shape
     VITE_ELECTRIC_SOURCE_ID=dev-source-001
     ```

3. **Deploy backend to Railway/Render**:
   - Deploy only the backend services (db, electric, postgres-bridge, nginx)
   - Update frontend env vars to point to backend URL

---

## Quick Start: Railway (Recommended)

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub/Codeberg
3. New Project → Deploy from GitHub repo
4. Select your `showme` repo
5. Railway auto-detects `compose.yaml`
6. Add environment variables (see above)
7. Deploy!

Railway will:
- Build all Docker containers
- Expose public URLs
- Handle SSL automatically
- Provide logs and monitoring

---

## Environment Variables Reference

### Backend Services:
```
POSTGRES_USER=showme
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=showme
DATABASE_URL=postgresql://showme:<password>@db:5432/showme?sslmode=disable
PGRST_DB_URI=postgresql://showme:<password>@db:5432/showme
PGRST_DB_SCHEMAS=public
PGRST_DB_ANON_ROLE=showme
ELECTRIC_INSECURE=true
PGRST_OPENAPI_SERVER_PROXY_URI=https://your-domain.com
```

### Frontend:
```
VITE_ELECTRIC_SHAPE_URL=https://your-backend-url/v1/shape
VITE_ELECTRIC_SOURCE_ID=dev-source-001
```

---

## Cost Comparison

| Service | Free Tier | Always-On | Best For |
|---------|----------|-----------|----------|
| Railway | $5/month credit | No (sleeps) | Easiest setup |
| Render | Free | No (15min sleep) | Simple deployments |
| Fly.io | 3 shared VMs | Yes | Always-on free tier |
| Vercel | Free | Yes | Frontend only |
| Netlify | Free | Yes | Frontend only |

**Recommendation**: Start with Railway for full-stack, or Vercel (frontend) + Railway (backend) for best performance.

---

## Troubleshooting

### Services sleeping:
- Railway/Render free tiers sleep after inactivity
- First request after sleep takes 30-60 seconds
- Upgrade to paid tier for always-on

### CORS issues:
- Make sure `PGRST_OPENAPI_SERVER_PROXY_URI` matches your frontend domain
- Check nginx CORS headers in `nginx.conf`

### Database connection:
- Ensure `DATABASE_URL` uses internal service names (e.g., `db:5432`)
- Railway/Render provide internal networking

### ElectricSQL sync:
- Verify `VITE_ELECTRIC_SHAPE_URL` points to nginx service (port 3013)
- Check ElectricSQL logs for connection issues

