# Backend Deployment (Singapore) - This Codebase

This guide is a production-focused deploy flow for the current backend in this repository.

It uses:
- Cloud Run (region: `asia-southeast1`)
- Artifact Registry repo: `lumina-live-sg`
- Secret Manager keys:
  - `GEMINI_API_KEY`
  - `FIREBASE_SERVICE_ACCOUNT`

## 0) Prerequisites

- `gcloud auth login` already completed
- Active project has billing enabled
- APIs enabled:
  - `run.googleapis.com`
  - `cloudbuild.googleapis.com`
  - `artifactregistry.googleapis.com`
  - `secretmanager.googleapis.com`

## 1) Set Variables (PowerShell)

Run from any folder:

```powershell
$PROJECT_ID="project05-empty"
$REGION="asia-southeast1"
$REPO="lumina-live-sg"
$SERVICE_NAME="lumina-live-backend"
$IMAGE="$REGION-docker.pkg.dev/$PROJECT_ID/$REPO/backend:latest"
```

Set project:

```powershell
gcloud config set project $PROJECT_ID
```

## 2) Create Artifact Registry (one-time)

```powershell
gcloud artifacts repositories create $REPO `
  --repository-format=docker `
  --location=$REGION `
  --description="Lumina Live container images (Singapore)"
```

If it already exists, continue.

## 3) Build Backend Image

### Option A: You are in `backend/` folder

```powershell
gcloud builds submit . --tag "$IMAGE"
```

### Option B: You are at repo root

```powershell
gcloud builds submit ./backend --tag "$IMAGE"
```

## 4) Create/Update Secrets (one-time, then only rotate)

From `backend/` folder:

```powershell
# Replace with real key value
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets create GEMINI_API_KEY --data-file=- --replication-policy=automatic

gcloud secrets create FIREBASE_SERVICE_ACCOUNT --data-file=./project05-empty-5bdf35dc0aea.json --replication-policy=automatic
```

If secret already exists, add new versions instead:

```powershell
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

gcloud secrets versions add FIREBASE_SERVICE_ACCOUNT --data-file=./project05-empty-5bdf35dc0aea.json
```

## 5) Grant Cloud Run Runtime Access to Secrets

```powershell
$PROJECT_NUMBER = gcloud projects describe $PROJECT_ID --format="value(projectNumber)"
$RUNTIME_SA = "$PROJECT_NUMBER-compute@developer.gserviceaccount.com"

gcloud secrets add-iam-policy-binding GEMINI_API_KEY `
  --member="serviceAccount:$RUNTIME_SA" `
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding FIREBASE_SERVICE_ACCOUNT `
  --member="serviceAccount:$RUNTIME_SA" `
  --role="roles/secretmanager.secretAccessor"
```

## 6) Deploy Cloud Run Backend

```powershell
gcloud run deploy $SERVICE_NAME `
  --image "$IMAGE" `
  --region $REGION `
  --platform managed `
  --allow-unauthenticated `
  --memory 1Gi `
  --cpu 2 `
  --timeout 3600 `
  --concurrency 80 `
  --min-instances 0 `
  --max-instances 10 `
  --set-env-vars "GOOGLE_CLOUD_PROJECT=$PROJECT_ID,GOOGLE_APPLICATION_CREDENTIALS=/secrets/service-account.json" `
  --set-secrets "GOOGLE_API_KEY=GEMINI_API_KEY:latest,/secrets/service-account.json=FIREBASE_SERVICE_ACCOUNT:latest"
```

### Important

Do **not** mount the secret file under `/app/...`.

Mounting to `/app/service-account.json` can shadow the app directory and cause startup failure:
- `Error loading ASGI app. Could not import module "main"`

Use `/secrets/service-account.json` as shown above.

## 7) Verify Deployment

```powershell
$BACKEND_URL = gcloud run services describe $SERVICE_NAME --region $REGION --format="value(status.url)"
$BACKEND_URL
curl "$BACKEND_URL/health"
```

Expected health response includes `status: healthy`.

## 8) Useful Logs / Debug

```powershell
gcloud run services logs read $SERVICE_NAME --region $REGION --limit 100
```

Revision specific:

```powershell
gcloud run revisions list --service $SERVICE_NAME --region $REGION
gcloud run revisions describe <REVISION_NAME> --region $REGION
```

## 9) Common Errors and Fixes

### Error: `could not find source [./backend]`
Cause: you are already inside `backend` folder.
Fix: run `gcloud builds submit . --tag "$IMAGE"`.

### Error: `UREQ_PROJECT_BILLING_NOT_FOUND`
Cause: billing not linked to project.
Fix: link billing account first, then re-enable APIs.

### Error: `Could not import module "main"` on Cloud Run
Cause: secret mounted under `/app/...`.
Fix: mount under `/secrets/...` and redeploy.

### Error: secret already exists
Use `gcloud secrets versions add ...` instead of `gcloud secrets create ...`.

## 10) Security Notes

- Keep service account JSON only local; never commit it.
- Keep API keys only in Secret Manager.
- Rotate secrets if they were ever exposed.
