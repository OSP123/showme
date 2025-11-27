# Deployment Guide - Free Hosting

## Actually Free Options

### Option 1: Fly.io (Recommended - Truly Free)

Fly.io offers a genuinely free tier with 3 shared VMs that stay running.

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

3. **Deploy using Docker**:
   ```bash
   cd /path/to/showme
   fly launch
   ```
   
   Fly will:
   - Detect your Docker setup
   - Create a `fly.toml` config
   - Deploy your services
   - Provide public URLs

4. **Configure environment variables**:
   ```bash
   fly secrets set POSTGRES_USER=showme
   fly secrets set POSTGRES_PASSWORD=<generate-strong-password>
   fly secrets set POSTGRES_DB=showme
   fly secrets set ELECTRIC_INSECURE=true
   # ... (see Environment Variables section below)
   ```

**Note**: Fly.io free tier includes 3 shared VMs that stay running. Perfect for small apps.

---

### Option 2: Render.com (Free but Sleeps)

Render has a free tier, but services sleep after 15 minutes of inactivity (slow first request after sleep).

#### Steps:

1. **Sign up at [render.com](https://render.com)**

2. **Option A: Use Render CLI**:
   ```bash
   npm install -g render-cli
   render login
   render deploy
   ```

3. **Option B: GitHub Mirror + Web UI**:
   - Push your Codeberg repo to GitHub (create a mirror)
   - In Render dashboard: New → Blueprint
   - Connect GitHub repository
   - Render will detect `compose.yaml`

4. **Configure services**:
   - Render will create services for each container
   - Set environment variables in each service
   - Free tier: Services sleep after 15 min (slow first request)

**Note**: Free but services sleep. First request after sleep takes 30-60 seconds.

---

### Option 3: Split Deployment (Best Performance)

Host frontend on free static hosting, backend on free tier.

#### Frontend: Vercel (Free, Always-On)

1. **Push to GitHub** (Vercel supports GitHub):
   - Create a GitHub repo (mirror your Codeberg repo)
   - Push your code

2. **Deploy to Vercel**:
   - Sign up at [vercel.com](https://vercel.com) (free)
   - Import your GitHub repository
   - Set root directory to `client`
   - Build command: `npm run build`
   - Output directory: `dist`
   - Add environment variables:
     ```
     VITE_ELECTRIC_SHAPE_URL=https://your-backend-url/v1/shape
     VITE_ELECTRIC_SOURCE_ID=dev-source-001
     ```

3. **Backend: Fly.io or Render**:
   - Deploy backend services (db, electric, postgres-bridge, nginx) to Fly.io
   - Or use Render (but it will sleep)
   - Update frontend env vars to point to backend URL

**Benefits**: 
- Frontend always-on (Vercel free tier)
- Backend on Fly.io free tier (always-on)
- Best performance for free

---

### Option 4: Self-Hosted (Completely Free)

If you have a server or VPS:

1. **Install Docker and Docker Compose**:
   ```bash
   # On Ubuntu/Debian
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   sudo apt-get install docker-compose-plugin
   ```

2. **Clone and deploy**:
   ```bash
   git clone <your-repo-url>
   cd showme
   docker compose up -d
   ```

3. **Set up reverse proxy** (nginx/Caddy):
   - Point domain to your server
   - Configure SSL with Let's Encrypt (free)

**Cost**: $0 if you have existing server/VPS

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

## Cost Comparison (Actually Free)

| Service | Free Tier | Always-On | Best For |
|---------|----------|-----------|----------|
| Fly.io | 3 shared VMs | Yes | Full-stack, always-on |
| Render | Free | No (15min sleep) | Simple deployments |
| Vercel | Free | Yes | Frontend only |
| Netlify | Free | Yes | Frontend only |
| Self-Hosted | $0 | Yes | If you have a server |

**Recommendation**: 
- **Best free option**: Fly.io for full-stack (always-on, truly free)
- **Best performance**: Vercel (frontend) + Fly.io (backend)
- **If you have a server**: Self-hosted (completely free)

---

## Troubleshooting

### Services sleeping (Render):
- Render free tier sleeps after 15 minutes
- First request after sleep takes 30-60 seconds
- Use Fly.io if you need always-on

### CORS issues:
- Make sure `PGRST_OPENAPI_SERVER_PROXY_URI` matches your frontend domain
- Check nginx CORS headers in `nginx.conf`

### Database connection:
- Ensure `DATABASE_URL` uses internal service names (e.g., `db:5432`)
- Fly.io/Render provide internal networking

### ElectricSQL sync:
- Verify `VITE_ELECTRIC_SHAPE_URL` points to nginx service (port 3013)
- Check ElectricSQL logs for connection issues

### Codeberg deployment:
- Most platforms don't support Codeberg directly
- Options:
  1. Use CLI tools (Fly.io CLI, Render CLI)
  2. Mirror to GitHub (push to both)
  3. Self-host
