# Lumina Live

Lumina Live is a Gemini-powered cafe kiosk that uses voice, vision, and a kitchen dashboard to move a customer from greeting to order pickup.

## Overview

The project is split into a Next.js frontend and a FastAPI backend:

- `frontend/` runs the kiosk UI and the kitchen dashboard.
- `backend/` handles Gemini Live, session state, tool calls, and Firestore writes.
- `docs/` contains setup, deployment, and testing notes.

## Tech Stack

| Layer | Technology |
|-------|------------|
| AI Model | Gemini Live (`gemini-2.5-flash-native-audio-latest`) |
| Frontend | Next.js 14, Tailwind CSS, Framer Motion, Zustand |
| Backend | FastAPI, WebSockets, google-genai SDK |
| Database | Firebase Firestore |
| Deployment | Google Cloud Run, Firebase |

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- Gemini API access
- Firebase project credentials if you want persistent orders

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Set these values in `backend/.env`:

```env
GOOGLE_API_KEY=your_gemini_api_key_here
GOOGLE_CLOUD_PROJECT=your_project_id_here
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
```

### Frontend

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Run locally

```bash
# Terminal 1
cd backend
venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

```bash
# Terminal 2
cd frontend
npm run dev
```

Open `http://localhost:3000` for the kiosk and `http://localhost:3000/kitchen` for the kitchen dashboard.

## Core Flows

- Voice and camera session start from the kiosk home screen.
- Kim can browse categories, highlight items, add to cart, and show payment.
- After payment, orders are sent to the kitchen dashboard with customer identification details.
- Kitchen staff can move orders through `pending`, `preparing`, and `ready` states.

## Documentation

- [Firebase setup](docs/setup-firebase.md)
- [Cloud deployment](docs/deploy-gcloud.md)
- [Automating cloud deployment (code + scripts)](docs/AUTOMATING_CLOUD_DEPLOYMENT.md)
- [Frontend deploy (Firebase Hosting, detailed)](docs/DEPLOY_FRONTEND_FIREBASE.md)
- [Medium blog draft (business-focused)](docs/MEDIUM_BLOG_LUMINA_LIVE.md)
- [How to test locally](docs/HOW_TO_TEST.md)

## Notes

- The kitchen dashboard expects Firestore-backed order data but now tolerates both camelCase and snake_case payloads.
- Price formatting is defensive, so missing totals no longer crash the UI.
