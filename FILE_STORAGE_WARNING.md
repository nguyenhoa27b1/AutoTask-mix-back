# ⚠️ FILE STORAGE WARNING - CRITICAL ISSUE

## 🔴 Current Problem: Ephemeral Storage on Render

### What's Happening?
The application currently stores uploaded files in a **local `uploads/` directory** on the Render server. This is **EPHEMERAL STORAGE** - files are **DELETED** in these scenarios:

1. ❌ **Server Restart**: Any manual or automatic restart
2. ❌ **New Deployment**: When you push code to GitHub
3. ❌ **Platform Maintenance**: Render moves containers
4. ❌ **Auto-Scaling**: If Render scales down and up

### Impact:
- ✅ Upload works fine
- ❌ Download fails after server restart (files gone!)
- ❌ All task submissions lost on redeploy
- ❌ Users cannot access previously uploaded files

---

## ✅ SOLUTION: Migrate to Cloud Storage

### Recommended Options:

### 1. **Cloudinary** (⭐ Recommended for small projects)
- **Free Tier**: 25GB storage, 25GB bandwidth/month
- **Pros**: Easy integration, built-in CDN, image optimization
- **Setup**: 5-10 minutes
- **Cost**: Free tier sufficient for small teams

```bash
npm install cloudinary multer-storage-cloudinary
```

**Implementation**:
```javascript
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'autotask-uploads',
    allowed_formats: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'png'],
  },
});

const upload = multer({ storage: storage });
```

---

### 2. **AWS S3** (Best for scalability)
- **Free Tier**: 5GB storage, 20,000 GET requests/month (12 months)
- **Pros**: Industry standard, unlimited scalability
- **Setup**: 15-20 minutes
- **Cost**: ~$0.023/GB after free tier

```bash
npm install @aws-sdk/client-s3 @aws-sdk/lib-storage multer-s3
```

---

### 3. **Google Cloud Storage** (Good for Google ecosystem)
- **Free Tier**: 5GB storage, 1GB network egress/month
- **Pros**: Integration with Google services
- **Setup**: 15-20 minutes
- **Cost**: ~$0.020/GB after free tier

```bash
npm install @google-cloud/storage multer-gcs
```

---

## 🔧 Current Code Location

### Upload Logic:
**File**: `server-wrapper.cjs`  
**Line**: ~937-950  
**Endpoint**: `POST /api/tasks/:id/submit`

```javascript
const uploadsDir = path.join(__dirname, 'uploads'); // ⚠️ EPHEMERAL!
fs.writeFileSync(savedPath, req.file.buffer);       // ⚠️ LOCAL DISK!
```

### Download Logic:
**File**: `server-wrapper.cjs`  
**Line**: ~1006-1060  
**Endpoint**: `GET /files/:id/download`

```javascript
if (file.path && fs.existsSync(file.path)) {  // ⚠️ PATH WON'T EXIST AFTER RESTART!
  return res.download(file.path, file.name);
}
```

---

## 🚀 Migration Steps (Cloudinary Example)

### Step 1: Install Package
```bash
npm install cloudinary multer-storage-cloudinary
```

### Step 2: Get Cloudinary Credentials
1. Sign up: https://cloudinary.com/users/register/free
2. Get credentials from Dashboard
3. Add to Render environment variables:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

### Step 3: Update Code
Replace multer memory storage with Cloudinary storage:

```javascript
// OLD (Ephemeral)
const upload = multer({ storage: multer.memoryStorage() });

// NEW (Persistent)
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'autotask-uploads',
    resource_type: 'auto', // Allows any file type
  },
});

const upload = multer({ storage: storage });
```

### Step 4: Update File Metadata
Instead of saving `path` (local), save `url` (cloud):

```javascript
const fileMeta = {
  id_file: newId,
  id_user: loggedInUser ? loggedInUser.user_id : 0,
  name: req.file.originalname,
  url: req.file.path,        // Cloudinary URL
  cloudinary_id: req.file.filename, // For deletion
};
```

### Step 5: Update Download Endpoint
Redirect to Cloudinary URL instead of serving from disk:

```javascript
app.get('/files/:id/download', (req, res) => {
  const file = mockFiles.find(f => f.id_file === Number(req.params.id));
  if (!file) return res.status(404).json({ error: 'File not found' });
  
  // Redirect to cloud storage URL
  return res.redirect(file.url);
});
```

---

## 📊 Comparison Table

| Storage Option | Free Tier | Setup Time | Persistence | Best For |
|---------------|-----------|------------|-------------|----------|
| **Local Disk** | ∞ | 0 min | ❌ No | Development only |
| **Cloudinary** | 25GB | 5-10 min | ✅ Yes | Small projects |
| **AWS S3** | 5GB | 15-20 min | ✅ Yes | Production apps |
| **Google Cloud** | 5GB | 15-20 min | ✅ Yes | Google ecosystem |

---

## ⚡ Quick Fix for Testing (Not Recommended)

If you need files to persist temporarily during development without cloud storage:

1. Use Render's **Persistent Disk** (Paid feature: $1/GB/month)
2. Mount disk to `/data` directory
3. Change `uploadsDir` to `/data/uploads`

**Note**: This is NOT recommended for production. Use cloud storage instead.

---

## 🎯 Action Items

### Immediate (Fix Download Bug):
- ✅ **DONE**: Updated `GET /files/:id/download` with proper headers
- ✅ **DONE**: Added `Content-Type` based on file extension
- ✅ **DONE**: Using `res.download()` for better file serving
- ✅ **DONE**: Added logging for debugging

### Short-term (Next 1-2 days):
- [ ] Choose cloud storage provider (recommend Cloudinary)
- [ ] Set up account and get API credentials
- [ ] Install npm packages
- [ ] Update upload/download code
- [ ] Test file persistence across deployments

### Long-term:
- [ ] Implement file deletion from cloud when task/user deleted
- [ ] Add file size limits and validation
- [ ] Implement virus scanning (optional)
- [ ] Set up CDN for faster downloads

---

## 📝 Testing Checklist

After migration to cloud storage:

- [ ] Upload file via task submission
- [ ] Verify file appears in cloud storage dashboard
- [ ] Download file successfully
- [ ] Redeploy application to Render
- [ ] Download same file again (should work!)
- [ ] Check file still accessible after 24 hours
- [ ] Test with different file types (PDF, DOCX, images)

---

## 🆘 Support

If you need help with migration:
1. Check Cloudinary docs: https://cloudinary.com/documentation
2. AWS S3 guide: https://docs.aws.amazon.com/s3/
3. Google Cloud Storage: https://cloud.google.com/storage/docs

---

**Priority**: 🔴 **HIGH** - Files are currently being lost on every deployment!
