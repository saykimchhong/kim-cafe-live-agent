# Kim Cafe Vision

AI-powered cafe ordering kiosk using Gemini Multimodal Live API.

## Quick Start

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

### Project Structure

```
kim-cafe-vision/
├── frontend/            # Next.js 14 app
│   ├── app/             # App router pages
│   ├── components/      # React components
│   │   ├── Kim/         # AI assistant avatar
│   │   ├── Menu/        # Menu display
│   │   ├── Cart/        # Shopping cart
│   │   ├── Payment/     # Payment flow
│   │   ├── screens/     # Screen views
│   │   └── ui/          # Reusable UI
│   ├── hooks/           # Custom hooks
│   ├── stores/          # Zustand state
│   └── lib/             # Utils & mock data
├── backend/             # FastAPI (to be added)
└── docker-compose.yml
```

### Routes

- `/` - Main kiosk interface
- `/kitchen` - Kitchen staff dashboard

### Agent Actions

The frontend responds to these WebSocket commands:

| Action | Payload | Description |
|--------|---------|-------------|
| `navigate_screen` | `string` | Navigate to screen |
| `add_to_cart` | `{itemId, quantity, customization?}` | Add item |
| `remove_from_cart` | `string` | Remove item |
| `highlight_item` | `string \| null` | Highlight menu item |
| `select_item` | `string` | Open item detail |
| `close_detail` | - | Close item detail |
| `kim_speak` | `string` | Kim speaks message |
| `kim_state` | `'idle' \| 'active' \| 'speaking' \| 'listening'` | Update Kim state |
| `show_payment` | `number` | Show payment QR |

### Tech Stack

- Next.js 14 (App Router)
- Tailwind CSS
- Framer Motion
- Zustand
- Lucide Icons
