# Render Deployment Quick Start

This guide will help you deploy ShowMe to Render in about 15-20 minutes.

## Prerequisites

✅ GitHub account  
✅ Render account (free) - [Sign up here](https://render.com)  
✅ Code pushed to GitHub repository

---

## Step 1: Deploy with Blueprint (2 minutes)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New** → **Blueprint**
3. Connect your GitHub repository
4. Select `render-blueprint.yaml`
5. Click **Apply**

Render will create 5 services:
- ✅ `showme-db` - PostgreSQL database
- ✅ `showme-electric` - ElectricSQL sync
- ✅ `showme-postgrest` - PostgREST API
- ✅ `showme-nginx` - Nginx proxy
- ✅ `showme-client` - Frontend

---

## Step 2: Enable PostGIS (1 minute)

1. Go to `showme-db` service
2. Click **Shell** tab
3. Run: `CREATE EXTENSION IF NOT EXISTS postgis;`

---

## Step 3: Run Migrations (2 minutes)

In the same database shell, copy and paste:

```sql
-- Contents of migrations/20_create_tables.sql
-- (Copy from your local file)

-- Contents of migrations/21_add_phase3_features.sql
-- (Copy from your local file)
```

---

## Step 4: Set Environment Variables (5 minutes)

### showme-nginx
```
ELECTRIC_URL = https://showme-electric.onrender.com
```

### showme-postgrest
```
PGRST_OPENAPI_SERVER_PROXY_URI = https://showme-postgrest.onrender.com
```

### showme-client
```
VITE_ELECTRIC_SHAPE_URL = https://showme-nginx.onrender.com/v1/shape
VITE_POSTGREST_URL = https://showme-postgrest.onrender.com
```

**Optional** (for photo uploads):
```
VITE_CLOUDINARY_CLOUD_NAME = your-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET = your-upload-preset
```

---

## Step 5: Redeploy Services (5 minutes)

After setting environment variables:

1. Go to each service (`showme-nginx`, `showme-postgrest`, `showme-client`)
2. Click **Manual Deploy** → **Deploy latest commit**
3. Wait for "Live" status

---

## Step 6: Test (2 minutes)

1. Visit `https://showme-client.onrender.com`
2. Create a test map
3. Add a pin (try Quick Pin: Medical, Water, etc.)
4. Open in another browser tab
5. Verify real-time sync ✨

---

## Troubleshooting

### ❌ Services won't start
- Check **Logs** tab for errors
- Verify all environment variables are set
- Ensure database shows "Available"

### ❌ CORS errors
- Ensure `VITE_ELECTRIC_SHAPE_URL` points to **nginx** (not electric directly)
- Check nginx logs

### ❌ Sync not working
- Verify PostGIS extension: `SELECT PostGIS_version();`
- Check ElectricSQL service is running
- Verify migrations ran successfully

---

## Costs

**Free Tier**: $0/month
- Services sleep after 15 min of inactivity
- First request takes 30-60 seconds to wake

**Starter Tier**: $35/month
- Always-on services
- Better for production use

---

## Next Steps

✅ Add custom domain (free with Render)  
✅ Enable HTTPS (automatic)  
✅ Monitor logs for errors  
✅ Test with real users  

For full deployment documentation, see [DEPLOYMENT.md](./DEPLOYMENT.md).
