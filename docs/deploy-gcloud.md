# Google Cloud Run Deployment Guide

This guide covers deploying Lumina Live to Google Cloud Run.

---

## 📋 Prerequisites

- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) installed and authenticated
- [Docker](https://docs.docker.com/get-docker/) installed (for local testing)
- Firebase/Firestore already set up (see [setup-firebase.md](setup-firebase.md))
- Billing enabled on your Google Cloud project

---

## 🔧 Step 1: Initial Setup

### Authenticate with Google Cloud

```bash
# Login to Google Cloud
gcloud auth login

# Set your project
gcloud config set project your-project-id

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

### Create Artifact Registry (for Docker images)

```bash
gcloud artifacts repositories create lumina-live \
    --repository-format=docker \
    --location=us-central1 \
    --description="Lumina Live container images"
```

---

## 🔐 Step 2: Store Secrets

Store sensitive credentials in Secret Manager:

```bash
# Store Gemini API Key
echo -n "your-gemini-api-key" | gcloud secrets create GEMINI_API_KEY \
    --data-file=- \
    --replication-policy=automatic

# Store service account key (for Firestore)
gcloud secrets create FIREBASE_SERVICE_ACCOUNT \
    --data-file=backend/service-account.json \
    --replication-policy=automatic
```

Grant Cloud Run access to secrets:

```bash
# Get the Cloud Run service account
PROJECT_NUMBER=$(gcloud projects describe your-project-id --format='value(projectNumber)')

# Grant access to secrets
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
    --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding FIREBASE_SERVICE_ACCOUNT \
    --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

---

## 🐳 Step 3: Build and Push Backend

### Option A: Using Cloud Build (Recommended)

```bash
cd backend

# Build and push to Artifact Registry
gcloud builds submit --tag us-central1-docker.pkg.dev/your-project-id/lumina-live/backend:latest
```

### Option B: Build Locally

```bash
cd backend

# Configure Docker for Artifact Registry
gcloud auth configure-docker us-central1-docker.pkg.dev

# Build image
docker build -t us-central1-docker.pkg.dev/your-project-id/lumina-live/backend:latest .

# Push to registry
docker push us-central1-docker.pkg.dev/your-project-id/lumina-live/backend:latest
```

---

## 🚀 Step 4: Deploy Backend to Cloud Run

```bash
gcloud run deploy lumina-live-backend \
    --image=us-central1-docker.pkg.dev/your-project-id/lumina-live/backend:latest \
    --region=us-central1 \
    --platform=managed \
    --allow-unauthenticated \
    --memory=1Gi \
    --cpu=2 \
    --timeout=3600 \
    --concurrency=80 \
    --min-instances=0 \
    --max-instances=10 \
    --set-env-vars="GOOGLE_CLOUD_PROJECT=your-project-id" \
    --set-secrets="GOOGLE_API_KEY=GEMINI_API_KEY:latest" \
    --set-secrets="/app/service-account.json=FIREBASE_SERVICE_ACCOUNT:latest" \
    --set-env-vars="GOOGLE_APPLICATION_CREDENTIALS=/app/service-account.json"
```

Note the service URL output (e.g., `https://lumina-live-backend-xxxxx.run.app`)

---

## 🌐 Step 5: Build and Deploy Frontend

### Update WebSocket URL

Update the frontend to connect to your Cloud Run backend. Edit `frontend/.env.local`:

```env
NEXT_PUBLIC_WS_URL=wss://lumina-live-backend-xxxxx.run.app/ws
NEXT_PUBLIC_API_URL=https://lumina-live-backend-xxxxx.run.app
```

### Create Frontend Dockerfile

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_API_URL

ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN yarn build

FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
```

### Update next.config.js

Add standalone output:

```javascript
// frontend/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
}

module.exports = nextConfig
```

### Build and Deploy Frontend

```bash
cd frontend

# Build with environment variables
gcloud builds submit \
    --tag us-central1-docker.pkg.dev/your-project-id/lumina-live/frontend:latest \
    --substitutions="_NEXT_PUBLIC_WS_URL=wss://lumina-live-backend-xxxxx.run.app/ws,_NEXT_PUBLIC_API_URL=https://lumina-live-backend-xxxxx.run.app"

# Deploy
gcloud run deploy lumina-live-frontend \
    --image=us-central1-docker.pkg.dev/your-project-id/lumina-live/frontend:latest \
    --region=us-central1 \
    --platform=managed \
    --allow-unauthenticated \
    --memory=512Mi \
    --cpu=1 \
    --min-instances=0 \
    --max-instances=5
```

---

## 🔗 Step 6: Custom Domain (Optional)

### Map Custom Domain

```bash
# Map domain to frontend
gcloud run domain-mappings create \
    --service=lumina-live-frontend \
    --domain=lumina.yourdomain.com \
    --region=us-central1

# Map domain to backend (for API)
gcloud run domain-mappings create \
    --service=lumina-live-backend \
    --domain=api.lumina.yourdomain.com \
    --region=us-central1
```

Follow the DNS configuration instructions provided by Google Cloud.

---

## 📊 Step 7: Monitor and Scale

### View Logs

```bash
# Backend logs
gcloud run services logs read lumina-live-backend --region=us-central1 --limit=100

# Frontend logs
gcloud run services logs read lumina-live-frontend --region=us-central1 --limit=100

# Tail logs in real-time
gcloud alpha run services logs tail lumina-live-backend --region=us-central1
```

### View Metrics

```bash
# Open Cloud Console monitoring
gcloud run services describe lumina-live-backend --region=us-central1 --format='value(status.url)'
```

Visit [Cloud Run Console](https://console.cloud.google.com/run) for detailed metrics.

### Adjust Scaling

```bash
# Update minimum instances (for faster cold starts)
gcloud run services update lumina-live-backend \
    --min-instances=1 \
    --region=us-central1

# Update max instances
gcloud run services update lumina-live-backend \
    --max-instances=20 \
    --region=us-central1
```

---

## 🔄 Continuous Deployment (Optional)

### Using Cloud Build Triggers

1. Connect your repository to Cloud Build:
   ```bash
   gcloud source repos create lumina-live
   # Or connect GitHub repository in Cloud Console
   ```

2. Create build trigger:
   ```bash
   gcloud builds triggers create github \
       --repo-name=lumina-live \
       --repo-owner=your-github-username \
       --branch-pattern="^main$" \
       --build-config=cloudbuild.yaml
   ```

3. Create `cloudbuild.yaml` in project root:

```yaml
# cloudbuild.yaml
steps:
  # Build backend
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/lumina-live/backend:$COMMIT_SHA'
      - './backend'
    id: 'build-backend'

  # Push backend image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/lumina-live/backend:$COMMIT_SHA'
    id: 'push-backend'

  # Deploy backend to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'lumina-live-backend'
      - '--image=us-central1-docker.pkg.dev/$PROJECT_ID/lumina-live/backend:$COMMIT_SHA'
      - '--region=us-central1'
      - '--platform=managed'
    id: 'deploy-backend'

  # Build frontend
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/lumina-live/frontend:$COMMIT_SHA'
      - '--build-arg'
      - 'NEXT_PUBLIC_WS_URL=wss://lumina-live-backend-xxxxx.run.app/ws'
      - './frontend'
    id: 'build-frontend'

  # Push frontend image
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/lumina-live/frontend:$COMMIT_SHA'
    id: 'push-frontend'

  # Deploy frontend to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'lumina-live-frontend'
      - '--image=us-central1-docker.pkg.dev/$PROJECT_ID/lumina-live/frontend:$COMMIT_SHA'
      - '--region=us-central1'
      - '--platform=managed'
    id: 'deploy-frontend'

images:
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/lumina-live/backend:$COMMIT_SHA'
  - 'us-central1-docker.pkg.dev/$PROJECT_ID/lumina-live/frontend:$COMMIT_SHA'
```

---

## 💰 Cost Optimization

### Recommendations

1. **Use minimum instances = 0** for development (pay only when used)
2. **Set minimum instances = 1** for production (faster response)
3. **Use `--cpu-throttling`** if CPU is consistently low
4. **Enable Cloud CDN** for static assets

### Estimated Costs

| Resource | Usage | Estimated Cost |
|----------|-------|----------------|
| Cloud Run (Backend) | 1M requests/month | ~$5-20/month |
| Cloud Run (Frontend) | 1M requests/month | ~$2-10/month |
| Firestore | 100K reads, 50K writes | ~$1-5/month |
| Secret Manager | 10K accesses | ~$0.30/month |
| **Total** | | **~$10-35/month** |

*Cloud Run has a generous free tier: 2 million requests/month free*

---

## 🆘 Troubleshooting

### "WebSocket connection failed"

1. Ensure backend allows unauthenticated access
2. Check CORS settings in backend
3. Verify WebSocket URL uses `wss://` (not `ws://`)

### "Container failed to start"

```bash
# Check logs
gcloud run services logs read lumina-live-backend --region=us-central1 --limit=50

# Verify image runs locally
docker run -p 8080:8080 us-central1-docker.pkg.dev/your-project-id/lumina-live/backend:latest
```

### "Permission denied" for secrets

```bash
# Verify secret access
gcloud secrets versions access latest --secret=GEMINI_API_KEY

# Re-grant permissions
PROJECT_NUMBER=$(gcloud projects describe your-project-id --format='value(projectNumber)')
gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
    --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
```

### "Cold start too slow"

```bash
# Set minimum instances
gcloud run services update lumina-live-backend \
    --min-instances=1 \
    --region=us-central1
```

---

## 🔗 Related Documentation

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud Build Documentation](https://cloud.google.com/build/docs)
- [Secret Manager Documentation](https://cloud.google.com/secret-manager/docs)
- [Artifact Registry Documentation](https://cloud.google.com/artifact-registry/docs)
