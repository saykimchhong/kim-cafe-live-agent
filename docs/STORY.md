# Lumina Live - Business Story

## Inspiration

Picture this: You're in a crowded cafe. The line is long. When you finally reach the counter, the barista can barely hear you over the espresso machine. You order a latte with oat milk, but they hear "almond." Ten minutes later, someone shouts "Order for... John?" — but your name is James. You grab something, hope it's yours, and walk away wondering if this is really the best we can do.

Now imagine a different experience:

You walk up to a friendly screen. A warm voice greets you: *"Hi there! I love the blue jacket — it really pops! What can I get you today?"*

You just talk, naturally. *"Can I get a latte? Oh, and what cakes do you have?"*

The screen comes alive — showing you the cake selection as Kim, your AI assistant, describes each one. You don't touch anything. You just have a conversation.

When your order is ready, the barista doesn't shout into the void. They walk over to *you* — the person in the blue jacket — because they know exactly who ordered what.

**That's Lumina Live.** An AI that sees you, hears you, and connects the dots between your digital order and your physical self.

---

## What it does

**Lumina Live** introduces **Kim**, a friendly AI assistant that transforms how people order at cafes, restaurants, and beyond.

### The Experience

**Step 1: Kim Sees You**
When you approach, Kim notices you arrive and greets you warmly. She might comment on something she observes — your cool sunglasses, your cozy sweater — making the interaction feel personal from the start.

**Step 2: You Just Talk**
No menus to scroll. No buttons to tap. Just tell Kim what you want:
- *"I'd like something sweet but not too heavy"*
- *"What's good for someone who doesn't usually drink coffee?"*
- *"Actually, make that two — my friend wants one too"*

Kim understands context, asks follow-up questions, and navigates the menu for you.

**Step 3: Kim Handles Everything**
She shows you items, highlights recommendations, adds things to your cart, and even remembers your preferences. The whole time, you're just having a conversation.

**Step 4: The Magic of Recognition**
Here's where it gets special: Kim remembers what you look like. When she sends your order to the kitchen, she includes a simple description: *"Person wearing blue jacket, round glasses, sitting near the window."*

No more shouting names. No more wrong orders grabbed. The staff simply walks to *you*.

### For Everyone Involved

| Who | What They Experience |
|-----|---------------------|
| **Customers** | Natural conversation, zero confusion, personal attention |
| **Staff** | Clear orders, customer descriptions, fewer mistakes |
| **Owners** | Faster service, happier customers, memorable experience |

---

## How we built it

We started with a question: **What would the perfect ordering experience feel like?**

Not faster. Not cheaper. But genuinely *better* — more human, despite being digital.

We mapped out the customer journey, from the moment someone approaches to the moment they receive their order. At each step, we asked: "What would a really great human assistant do here?"

A great assistant would:
- Notice when you arrive and greet you
- Listen to what you want, not just what you say
- Show you things visually while explaining them verbally
- Remember what you look like so they can find you later
- Handle changes gracefully ("Actually, make that decaf")

Then we built Kim to do exactly that.

We used Google's latest AI technology that can simultaneously see through a camera, listen through a microphone, speak naturally, and take actions on screen — all in real-time. Kim isn't playing back recordings or following a script. She's genuinely conversing with each customer, adapting to their needs moment by moment.

The kitchen display connects instantly, showing each order alongside a description of who ordered it. No more "Order 47!" — just "The order for the person in the green hoodie is ready."

---

## Challenges we ran into

### Making Conversation Feel Natural

The biggest challenge wasn't technical — it was emotional. How do you make talking to a screen feel comfortable rather than awkward?

We learned that visual feedback matters enormously. When Kim highlights items on screen as she talks about them, customers feel heard and understood. When there's a brief pause, a small animation shows Kim is thinking. These tiny details transformed the experience from "talking to a computer" to "talking with an assistant."

### The Recognition Balance

We wanted Kim to recognize customers for practical reasons (finding them when orders are ready), but we had to be thoughtful about privacy and comfort.

We settled on a simple approach: Kim describes what she sees in the moment ("blue jacket, glasses") rather than identifying who someone is. It's temporary and contextual — like how a friend might say "the person in red" rather than using facial recognition databases.

### Handling Real Conversation

Real people don't talk in perfect sentences. They interrupt themselves, change their minds, ask tangential questions, and sometimes just think out loud.

"I'll have a... wait, do you have oat milk? Oh you do? Great, then a latte with oat milk. Actually no, make it two. Wait — is your oat milk Oatly or something else?"

Teaching Kim to handle this gracefully — tracking the actual intent through all the meandering — was our biggest learning curve.

---

## Deployment Architecture (What We Actually Run)

### Backend Deployment

- Containerized FastAPI service on Cloud Run (`asia-southeast1`).
- Image registry via Artifact Registry (`lumina-live-sg`).
- Runtime secrets injected from Secret Manager:
	- `GEMINI_API_KEY`
	- `FIREBASE_SERVICE_ACCOUNT`
- Firestore used for persistent service/operation data.

### Frontend Deployment

- Next.js static export (`output: 'export'`).
- Build output in `frontend/out`.
- Hosted on Firebase Hosting (`project05-empty`).
- Production API and WebSocket endpoints injected at build time:
	- `NEXT_PUBLIC_API_URL`
	- `NEXT_PUBLIC_WS_URL`

<!-- IMAGE: Deployment topology (Firebase Hosting -> Cloud Run -> Gemini/Firestore) -->

---

## Why This Matters to Business Teams

Lumina Live is not a single-vertical product. It is a reusable customer service runtime for any environment where speed, clarity, and personalization are critical.

### Applicable Verticals

- Retail and showroom guidance
- Hospitality and concierge services
- Healthcare check-in and triage intake
- Event registration and wayfinding
- Financial branch and public service kiosks

### Business Outcomes It Targets

- Shorter service cycles
- Lower error rates in fulfillment
- Higher first-interaction resolution
- Better customer trust through transparent, guided interaction

---

## Key Product Decisions

### Controlled Agency

The AI agent does not get unrestricted UI control. It can only execute approved tool calls, preserving safe and predictable behavior.

### Real-Time Context Consistency

Conversation state, UI state, and backend records are synchronized so handoff errors are minimized.

### Deployment Practicality

Frontend and backend are independently deployable, making operational updates safer and faster for production teams.

---

## What We Learned

1. **Natural conversation is not enough**; reliable state management is what makes production service viable.
2. **Navigation orchestration** is the bridge between AI understanding and business execution.
3. **Deployment discipline** (secrets, isolated services, static hosting) is essential for operational trust.
4. **Business framing matters**: this is a customer service platform pattern, not just a single-domain demo.

---

## Next Roadmap

- Multilingual live service profiles
- Domain-specific service playbooks by vertical
- Analytics dashboard for conversion and service quality
- Enterprise controls for policy, auditability, and compliance

<!-- IMAGE: Roadmap timeline by quarter -->

---

## Final Positioning

Lumina Live is a business-ready live customer service architecture that unifies conversation, interface control, and operations handoff in one real-time system.

It turns AI from a passive responder into an accountable service operator.
