# How To Test

This guide covers the fastest way to verify the kiosk flow locally after backend or frontend changes.

## Prerequisites

- Node.js 18+
- Python 3.11+
- A Gemini API key
- Firebase / Firestore credentials if you want live order persistence

## Environment Setup

### Backend

Create `backend/.env` from `backend/.env.example` and set:

```env
GOOGLE_API_KEY=your_gemini_api_key_here
GOOGLE_CLOUD_PROJECT=your_project_id_here
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
```

### Frontend

Create `frontend/.env.local` and set:

```env
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Install Dependencies

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend

```bash
cd frontend
npm install
```

## Run Locally

### Terminal 1: backend

```bash
cd backend
venv\Scripts\activate
uvicorn main:app --reload --port 8000
```

### Terminal 2: frontend

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000` for the customer kiosk.

## Smoke Test Checklist

### 1. Basic app load

- Open the home page.
- Confirm the page renders without a runtime error.
- Confirm the Start button is visible.

### 2. Session start

- Click Start.
- Allow microphone and camera access.
- Confirm the frontend connects to the backend.
- Confirm the backend logs a new session.

### 3. Menu navigation

- Navigate between coffee, bakery, cake, and food.
- Open an item detail.
- Add an item to cart.
- Change quantity and verify totals update.

### 4. Payment flow

- Open the cart.
- Continue to payment.
- Confirm the QR screen renders.
- Let the countdown finish or trigger payment completion.

### 5. Kitchen dashboard

- Open `http://localhost:3000/kitchen`.
- Confirm active orders render without crashing.
- Confirm orders show customer info, location, and total.
- Change an order from Pending to Preparing to Ready.

### 6. Regression check for price formatting

- Verify no screen crashes with `Cannot read properties of undefined (reading 'toFixed')`.
- Verify prices still display as currency, for example `$4.50`.

## API Checks

These are useful if the UI is failing and you want to isolate backend behavior.

### Health endpoint

Open:

```text
http://localhost:8000/health
```

Expected:

- JSON response with `status: healthy`

### Kitchen orders endpoint

Open:

```text
http://localhost:8000/kitchen/orders
```

Expected:

- JSON response with an `orders` array
- Existing orders may use Firestore camelCase fields such as `orderId`, `totalAmount`, and `createdAt`

## Common Issues

### Backend starts but kiosk does not connect

- Check `NEXT_PUBLIC_WS_URL` in `frontend/.env.local`
- Check backend is running on port `8000`

### Kitchen page loads but shows no orders

- Confirm Firestore is configured correctly
- Confirm orders were created through the kiosk flow
- Confirm `GET /kitchen/orders` returns data

### Camera or microphone fails

- Allow browser permissions
- Retry in a fresh tab
- Check if another app is already using the device

## Optional Build Verification

### Frontend production build

```bash
cd frontend
npm run build
```

### Backend import check

```bash
cd backend
venv\Scripts\activate
python -c "import main; print('backend import ok')"
```