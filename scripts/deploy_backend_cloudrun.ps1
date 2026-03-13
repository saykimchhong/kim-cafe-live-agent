[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectId,
  [string]$Region = "asia-southeast1",
  [string]$RepoName = "lumina-live-sg",
  [string]$ServiceName = "lumina-live-backend",
  [string]$ImageName = "backend",
  [string]$Tag = "manual"
)

$ErrorActionPreference = "Stop"
$image = "${Region}-docker.pkg.dev/${ProjectId}/${RepoName}/${ImageName}:${Tag}"
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$backendPath = Join-Path $repoRoot "backend"

if (-not (Test-Path $backendPath)) {
  throw "Backend path not found: $backendPath"
}

Write-Host "Using image: $image"
gcloud config set project $ProjectId | Out-Null

gcloud builds submit $backendPath --tag $image --project $ProjectId
if ($LASTEXITCODE -ne 0) {
  throw "Cloud Build failed."
}

gcloud run deploy $ServiceName `
  --image $image `
  --region $Region `
  --platform managed `
  --allow-unauthenticated `
  --memory 1Gi `
  --cpu 2 `
  --timeout 3600 `
  --concurrency 80 `
  --min-instances 0 `
  --max-instances 10 `
  --set-env-vars "GOOGLE_CLOUD_PROJECT=$ProjectId,GOOGLE_APPLICATION_CREDENTIALS=/secrets/service-account.json" `
  --set-secrets "GOOGLE_API_KEY=GEMINI_API_KEY:latest,/secrets/service-account.json=FIREBASE_SERVICE_ACCOUNT:latest"

if ($LASTEXITCODE -ne 0) {
  throw "Cloud Run deployment failed."
}

$serviceUrl = gcloud run services describe $ServiceName --region $Region --project $ProjectId --format "value(status.url)"
Write-Host "Deployment successful. Service URL: $serviceUrl"
