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

### Option 2: Render.com (Easy Deployment with Blueprint)

Render has a free tier, but services sleep after 15 minutes of inactivity (slow first request after sleep).

> **⚠️ Free Tier Note**: Free services sleep after 15 minutes of inactivity. First request after sleep takes 30-60 seconds. For always-on services, upgrade to Starter plan ($7/month per service).

#### Prerequisites

1. **GitHub Account** - Render connects to GitHub repositories
2. **Render Account** - Sign up at [render.com](https://render.com)

#### Step-by-Step Deployment

**1. Push Code to GitHub**

```bash
# If you haven't already, create a GitHub repo and push your code
git remote add origin https://github.com/yourusername/showme.git
git push -u origin main
```

**2. Create Render Account**

- Go to [render.com](https://render.com)
- Sign up with GitHub
- Authorize Render to access your repositories

**3. Deploy Using Blueprint**

- In Render Dashboard, click **New** → **Blueprint**
- Connect your GitHub repository
- Render will detect `render-blueprint.yaml`
- Click **Apply**

Render will create:
- `showme-db` - PostgreSQL database (free tier, 1GB)
- `showme-electric` - ElectricSQL sync service
- `showme-postgrest` - PostgREST HTTP API
- `showme-nginx` - Nginx reverse proxy
- `showme-client` - Frontend static site

**4. Enable PostGIS Extension**

After database is created:
- Go to `showme-db` in Render dashboard
- Click **Info** tab
- Under **Connection**, click **Connect** → **External Connection**
- Use any PostgreSQL client or the web shell
- Run: `CREATE EXTENSION IF NOT EXISTS postgis;`

**5. Run Database Migrations**

In Render dashboard:
- Go to `showme-db` → **Shell** tab
- Copy and paste the contents of `migrations/20_create_tables.sql`
- Copy and paste the contents of `migrations/21_add_phase3_features.sql`

Or use the external connection:
```bash
# Get the external connection URL from Render dashboard
psql <external-database-url>

# Then run:
\i migrations/20_create_tables.sql
\i migrations/21_add_phase3_features.sql
```

**6. Configure Environment Variables**

After deployment, set these environment variables in each service:

**showme-nginx:**
- `ELECTRIC_URL` = `https://showme-electric.onrender.com` (or your actual electric service URL)

**showme-postgrest:**
- `PGRST_OPENAPI_SERVER_PROXY_URI` = `https://showme-postgrest.onrender.com`

**showme-client:**
- `VITE_ELECTRIC_SHAPE_URL` = `https://showme-nginx.onrender.com/v1/shape`
- `VITE_POSTGREST_URL` = `https://showme-postgrest.onrender.com`
- `VITE_CLOUDINARY_CLOUD_NAME` = (optional, your Cloudinary cloud name)
- `VITE_CLOUDINARY_UPLOAD_PRESET` = (optional, your Cloudinary upload preset)

**7. Trigger Redeployment**

After setting environment variables:
- Go to each service
- Click **Manual Deploy** → **Deploy latest commit**
- Wait for all services to show "Live" status

**8. Test Your Deployment**

Visit `https://showme-client.onrender.com` and:
- Create a test map
- Add a pin using Quick Pin
- Open the same map in another browser tab
- Verify real-time sync works

#### Troubleshooting

**Services won't start:**
- Check logs in each service's **Logs** tab
- Verify all environment variables are set correctly
- Ensure database connection is successful

**CORS errors:**
- Verify `VITE_ELECTRIC_SHAPE_URL` points to nginx service (not electric directly)
- Check nginx logs for proxy errors

**Sync not working:**
- Verify ElectricSQL service is running
- Check that PostGIS extension is enabled
- Verify database migrations ran successfully

**Database connection failed:**
- Ensure `DATABASE_URL` environment variable is connected to `showme-db`
- Check database is in "Available" status
- Verify PostgreSQL version is 17



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
