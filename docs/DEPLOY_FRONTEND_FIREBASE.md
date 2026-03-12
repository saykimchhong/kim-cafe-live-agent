# Frontend Deployment to Firebase Hosting (This Repository)

This guide deploys the Next.js frontend to Firebase Hosting for project `project05-empty`.

It matches the current repo setup:
- Next.js static export (`output: 'export'`)
- Hosting public directory: `frontend/out`
- Hosting site in `firebase.json`: `project05-empty`

## 1) Prerequisites

- Backend Cloud Run service is already deployed
- Firebase CLI access through local `npx`
- Logged in to Firebase account with access to `project05-empty`

## 2) Set Variables (PowerShell)

```powershell
$PROJECT_ID="project05-empty"
$REGION="asia-southeast1"
$BACKEND_SERVICE="lumina-live-backend"
```

## 3) Get Backend URL and Build-Time Frontend Env

```powershell
$BACKEND_URL = gcloud run services describe $BACKEND_SERVICE --region $REGION --format="value(status.url)"
$BACKEND_WS = $BACKEND_URL -replace '^https://','wss://' + "/ws"

$env:NEXT_PUBLIC_API_URL = $BACKEND_URL
$env:NEXT_PUBLIC_WS_URL = $BACKEND_WS
```

## 4) Build Static Frontend

Run from `frontend` folder:

```powershell
Set-Location frontend
yarn build
```

This generates static files in `frontend/out`.

## 5) Firebase Login (if needed)

```powershell
npx firebase login
```

Check active login:

```powershell
npx firebase login:list
```

## 6) Deploy to Firebase Hosting

Run from repository root:

```powershell
Set-Location ..
npx --prefix frontend firebase deploy --only hosting --project $PROJECT_ID
```

Expected output includes a Hosting URL like:
- `https://project05-empty.web.app`

## 7) Verify

- Open Hosting URL
- Confirm kiosk loads
- Open `/kitchen` route and verify API data loads from backend

## 8) Common Issues

### `firebase` command not found
Use local CLI via `npx`:

```powershell
npx --prefix frontend firebase --version
```

### `Failed to authenticate`
Run login again:

```powershell
npx firebase login
```

### Wrong API/WS endpoint in production
Rebuild and redeploy in the same shell after setting:
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_WS_URL`

### Site mismatch
Confirm `firebase.json` uses:
- `hosting.site = "project05-empty"`
- `hosting.public = "frontend/out"`
