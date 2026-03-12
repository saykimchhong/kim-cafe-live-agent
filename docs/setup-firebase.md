# Firebase Setup Guide

This guide walks you through setting up Firebase for Lumina Live.

---

## 📋 Prerequisites

- Google account
- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) installed
- Project cloned and backend dependencies installed

---

## 🔥 Step 1: Create Firebase Project

### Option A: Using Firebase Console (Recommended)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add project**
3. Enter project name: `lumina-live` (or your preferred name)
4. Enable/Disable Google Analytics as preferred
5. Click **Create project**

### Option B: Using CLI

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Create project
firebase projects:create lumina-live --display-name "Lumina Live"
```

---

## 🗄️ Step 2: Enable Firestore

### Using Console

1. In Firebase Console, select your project
2. Go to **Build** → **Firestore Database**
3. Click **Create database**
4. Choose **Start in production mode**
5. Select a location closest to your users (e.g., `us-central1 `)
6. Click **Enable**

### Using CLI

```bash
# Enable Firestore API
gcloud services enable firestore.googleapis.com --project=project05-empty

# Create Firestore database
gcloud firestore databases create --location=us-central1 --project=project05-empty
```

---

## 🔐 Step 3: Create Service Account

The backend needs credentials to access Firestore.

### Using Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your Firebase project
3. Navigate to **IAM & Admin** → **Service Accounts**
4. Click **Create Service Account**
5. Fill in details:
   - Name: `lumina-live-backend`
   - ID: `lumina-live-backend`
6. Click **Create and Continue**
7. Add roles:
   - `Cloud Datastore User` (for Firestore)
   - `Firebase Admin SDK Administrator Service Agent` (optional)
8. Click **Done**

### Generate Key

1. Click on the service account you just created
2. Go to **Keys** tab
3. Click **Add Key** → **Create new key**
4. Select **JSON**
5. Click **Create**
6. Save the downloaded file as `service-account.json` in your `backend/` folder

### Using CLI

```bash
# Create service account
gcloud iam service-accounts create lumina-live-backend \
    --display-name="Lumina Live Backend" \
    --project=your-project-id

# Grant Firestore access
gcloud projects add-iam-policy-binding your-project-id \
    --member="serviceAccount:lumina-live-backend@your-project-id.iam.gserviceaccount.com" \
    --role="roles/datastore.user"

# Generate key file
gcloud iam service-accounts keys create backend/service-account.json \
    --iam-account=lumina-live-backend@your-project-id.iam.gserviceaccount.com \
    --project=your-project-id
```

---

## 📝 Step 4: Configure Environment

Create or update `.env` file in the `backend/` folder:

```env
GOOGLE_API_KEY=your-gemini-api-key-here
GOOGLE_CLOUD_PROJECT=your-firebase-project-id
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
```

### Getting Your Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click **Create API Key**
3. Select your project or create a new one
4. Copy the API key

---

## 🏗️ Step 5: Create Firestore Indexes (Optional)

For optimal query performance, create indexes. Go to Firestore Console → Indexes → Add Index:

### Orders Collection Index

| Field | Order |
|-------|-------|
| `status` | Ascending |
| `createdAt` | Descending |

### Sessions Collection Index

| Field | Order |
|-------|-------|
| `status` | Ascending |
| `startedAt` | Descending |

Or use the CLI with `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "sessions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "startedAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

Deploy indexes:
```bash
firebase deploy --only firestore:indexes
```

---

## ✅ Step 6: Verify Setup

Test your configuration:

```bash
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate
python -c "
from config import get_settings
from google.cloud import firestore

settings = get_settings()
print(f'Project: {settings.google_cloud_project}')

db = firestore.Client(project=settings.google_cloud_project)
print('Firestore connected!')

# Test write
test_ref = db.collection('_test').document('connection')
test_ref.set({'status': 'ok', 'timestamp': firestore.SERVER_TIMESTAMP})
print('Write successful!')

# Cleanup
test_ref.delete()
print('Cleanup successful!')
"
```

If you see "Firestore connected!" and "Write successful!", your setup is complete!

---

## 🔒 Security Rules

For production, update your Firestore security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Backend service account has full access via Admin SDK
    // These rules apply to client-side access only
    
    match /orders/{orderId} {
      // Kitchen display can read orders
      allow read: if true;
      // Only backend can write
      allow write: if false;
    }
    
    match /sessions/{sessionId} {
      // Sessions are managed by backend only
      allow read, write: if false;
    }
  }
}
```

---

## 📚 Firestore Data Structure

### Orders Collection (`orders`)

```javascript
{
  orderId: "ORD-A1B2C3D4",
  sessionId: "sess-abc123",
  customerName: "John",
  customerAppearance: "Person wearing blue jacket and glasses",
  tableOrLocation: "Table 5",
  items: [
    {
      itemId: "latte",
      name: "Caffè Latte",
      quantity: 2,
      customization: "oat milk",
      price: 65
    }
  ],
  totalAmount: 130,
  status: "pending", // pending | preparing | ready | completed
  createdAt: Timestamp,
  updatedAt: Timestamp,
  conversation: [
    { role: "customer", content: "I'd like a latte", timestamp: "..." },
    { role: "kim", content: "Great choice! Would you like any milk alternatives?", timestamp: "..." }
  ]
}
```

### Sessions Collection (`sessions`)

```javascript
{
  sessionId: "sess-abc123",
  startedAt: Timestamp,
  endedAt: Timestamp | null,
  customerName: "John",
  customerAppearance: "Blue jacket, glasses",
  status: "active", // active | completed
  events: [
    {
      type: "tool_call",
      timestamp: Timestamp,
      data: { tool: "add_to_cart", args: {...}, result: {...} }
    }
  ]
}
```

---

## 🆘 Troubleshooting

### "Could not automatically determine credentials"

Make sure `GOOGLE_APPLICATION_CREDENTIALS` path is correct and the file exists:

```bash
# Check if file exists
ls -la backend/service-account.json

# Verify it's valid JSON
cat backend/service-account.json | python -m json.tool
```

### "Permission denied" errors

1. Verify service account has `Cloud Datastore User` role
2. Check project ID matches in `.env` and service account JSON

### "Firestore API not enabled"

```bash
gcloud services enable firestore.googleapis.com --project=your-project-id
```

---

## 🔗 Related Documentation

- [Google Cloud Firestore Documentation](https://cloud.google.com/firestore/docs)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Service Account Authorization](https://cloud.google.com/docs/authentication/getting-started)
