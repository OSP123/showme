# Cloudinary Setup for Photo Upload

## Quick Setup (5 minutes)

### 1. Create Cloudinary Account

1. Go to [cloudinary.com](https://cloudinary.com)
2. Click "Sign Up Free"
3. Complete registration

### 2. Get Credentials

After logging in:

1. Go to **Dashboard**
2. Copy your **Cloud Name** (e.g., "dxxxx123")
3. Go to **Settings** → **Upload**
4. Scroll to **Upload presets**
5. Click **Add upload preset**

### 3. Configure Upload Preset

**Important**: Create an **unsigned** upload preset:

1. **Preset name**: `showme-photos` (or any name)
2. **Signing Mode**: **Unsigned**
3. **Folder**: `showme-pins` (optional, for organization)
4. **Access mode**: Public
5. **Allowed formats**: `jpg,png,webp,heic`
6. Click **Save**

### 4. Add to Environment

Add to your `.env` file:

```bash
VITE_CLOUDINARY_CLOUD_NAME=your-cloud-name
VITE_CLOUDINARY_UPLOAD_PRESET=showme-photos
```

For production, add to Railway/Render environment variables.

---

## Verification

Test the upload:

```typescript
import { uploadToCloudinary } from './lib/imageUpload';

// In browser console:
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.accept = 'image/*';
fileInput.onchange = async (e) => {
  const file = e.target.files[0];
  const result = await uploadToCloudinary(file);
  console.log('Uploaded:', result.url);
};
fileInput.click();
```

---

## Usage in ShowMe

### Adding Photos to Pins

```svelte
<script>
  import PhotoUpload from './lib/PhotoUpload.svelte';
  import PhotoGallery from './lib/PhotoGallery.svelte';

  let photoUrls = [];
  let thumbnails = [];

  function handleUpload(event) {
    const results = event.detail;
    photoUrls = [...photoUrls, ...results.map(r => r.url)];
    thumbnails = [...thumbnails, ...results.map(r => r.thumbnail)];
  }

  function handleDelete(event) {
    const index = event.detail;
    photoUrls.splice(index, 1);
    thumbnails.splice(index, 1);
    photoUrls = photoUrls; // Trigger reactivity
  }
</script>

<PhotoUpload on:upload={handleUpload} on:error={(e) => alert(e.detail)} />

{#if photoUrls.length > 0}
  <PhotoGallery photos={photoUrls} {thumbnails} on:delete={handleDelete} />
{/if}
```

---

## Free Tier Limits

Cloudinary free tier includes:

- **Storage**: 25GB
- **Bandwidth**: 25GB/month
- **Transformations**: 25,000/month
- **Images**: ~25,000 photos @ 1MB each

**Typical Usage**:
- 100 users x 10 pins x 2 photos avg = 2,000 photos
- @ 1MB each = 2GB storage, 200MB bandwidth/day
- **Well within free tier** ✅

---

## Advanced Features (Future)

### Auto-Moderation
Enable in Cloudinary dashboard:
- **Settings** → **Security** → **Moderation**
- Detect inappropriate content
- Auto-reject or queue for review

### Image Optimization
Already included via URL transformations:
```typescript
// Auto quality, format
url.replace('/upload/', '/upload/q_auto,f_auto/')

// Responsive sizing
url.replace('/upload/', '/upload/w_800,c_limit/')
```

### Storage Cleanup
Delete unused photos:
```typescript
// Cloudinary Admin API (requires API key)
await cloudinary.api.delete_resources(['public_id_1', 'public_id_2']);
```

---

## Troubleshooting

### "Upload preset not found"
- Double-check preset name in Cloudinary dashboard
- Must be **unsigned** preset
- Verify `VITE_CLOUDINARY_UPLOAD_PRESET` matches exactly

### "Invalid cloud name"
- Check `VITE_CLOUDINARY_CLOUD_NAME` in `.env`
- Should NOT include "http://" or URL

### CORS errors
- Unsigned presets work from any domain
- No CORS setup needed for basic upload
- If issues, check browser console for exact error

### Upload fails
- Check file size (max 5MB)
- Verify image format (jpg, png, webp, heic)
- Check network tab for API response

---

## Production Checklist

- [ ] Cloudinary account created
- [ ] Upload preset configured (unsigned)
- [ ] Environment variables set
- [ ] Test upload works
- [ ] Limit enforced (5 photos per pin)
- [ ] Compression working (images < 2MB)
- [ ] Thumbnails generating correctly
- [ ] Lightbox displaying photos
- [ ] Delete functionality works

---

## Next Steps

1. Complete Cloudinary setup
2. Test photo upload in development
3. Deploy to production with env vars
4. Monitor usage in Cloudinary dashboard
5. Upgrade plan if needed (unlikely for MVP)
