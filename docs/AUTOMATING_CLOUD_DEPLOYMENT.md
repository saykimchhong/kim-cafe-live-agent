# Automating Cloud Deployment

This repository includes deployment automation code for Google Cloud.

## Automation Artifacts

- `cloudbuild.yaml`
  - Builds backend container image
  - Pushes image to Artifact Registry
  - Deploys backend to Cloud Run

- `scripts/deploy_backend_cloudrun.ps1`
  - Runs build and deploy from PowerShell with parameterized project/region/service values

- `.github/workflows/deploy-backend-cloudrun.yml`
  - Automates backend build and deployment on `main` pushes or manual trigger
  - Uses GitHub Actions + Google Cloud authentication to deploy Cloud Run

- `.github/workflows/deploy-frontend-firebase.yml`
  - Automates frontend static build and Firebase Hosting deployment on `main` pushes or manual trigger
  - Resolves backend Cloud Run URL and injects frontend runtime env at build time

## Cloud Build Trigger Example

```bash
gcloud builds triggers create github \
  --name="lumina-live-backend-cicd" \
  --repo-name="kim-cafe-vision" \
  --repo-owner="<your-github-owner>" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml"
```

## Manual Script Example

```powershell
./scripts/deploy_backend_cloudrun.ps1 -ProjectId "your-project-id" -Region "asia-southeast1"
```

## GitHub Actions Setup

Create these repository secrets before running the workflow:

- `GCP_PROJECT_ID`
- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_DEPLOYER_SERVICE_ACCOUNT`

Workflow file:

- `.github/workflows/deploy-backend-cloudrun.yml`
- `.github/workflows/deploy-frontend-firebase.yml`
