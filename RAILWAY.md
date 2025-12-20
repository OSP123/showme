# Railway Deployment Guide

## Quick Start

Railway CLI is installed! Follow these steps to deploy:

### 1. Login to Railway

```bash
railway login
```

This opens your browser to authenticate with GitHub.

### 2. Initialize Project

```bash
cd /Users/omar.patel/projects/personal/showme
railway init
```

Choose: **"Create new project"**  
Name: `showme`

### 3. Add PostgreSQL Database

```bash
railway add --database postgres
```

This creates a managed PostgreSQL database.

### 4. Link Project

```bash
railway link
```

Select your `showme` project.

### 5. Grant REPLICATION Privileges

```bash
# Connect to database
railway run psql

# In psql, run:
CREATE EXTENSION IF NOT EXISTS postgis;
ALTER USER postgres WITH REPLICATION;
ALTER USER postgres WITH SUPERUSER;
\q
```

### 6. Run Migrations

```bash
railway run psql < migrations/20_create_tables.sql
railway run psql < migrations/21_add_phase3_features.sql
```

### 7. Set Environment Variables

```bash
railway variables set ELECTRIC_INSECURE=true
railway variables set NODE_ENV=production
railway variables set VITE_CLOUDINARY_CLOUD_NAME=dmwttd5c7
railway variables set VITE_CLOUDINARY_UPLOAD_PRESET=showme-photos
```

### 8. Deploy!

```bash
railway up
```

### 9. Get Your URL

```bash
railway domain
```

Or visit the Railway dashboard to see your live URL.

---

## Verify Deployment

```bash
# Check status
railway status

# View logs
railway logs

# Check all services
railway ps
```

---

## Troubleshooting

**If deployment fails:**
```bash
railway logs --tail 100
```

**If database connection fails:**
```bash
railway variables
# Verify DATABASE_URL is set
```

**Test locally first:**
```bash
docker-compose -f compose.railway.yaml up
```

---

## Next Steps After Deployment

1. Visit your Railway URL
2. Create a test map
3. Add pins
4. Test real-time sync (open two browser tabs)
5. Test offline mode

✅ Your app is now deployed on Railway!
