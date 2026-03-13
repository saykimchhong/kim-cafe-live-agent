# Lumina Live on Google Cloud: From Demo Assistant to Real-Time Operator

**Subtitle:** We built Lumina Live to show that with Gemini Live and Google Cloud, an AI agent can do more than respond — it can run operational workflows in real time.

**Estimated read time:** 6–7 minutes

> **Reader Guide**
> - **For judges:** focus on **Hackathon Evidence Package** and **Launch Readiness and Scale**.
> - **For engineers:** focus on **Google Cloud Architecture** and **Gemini Live Runtime Design**.
> - **For product teams:** focus on **The Real Problem We Target** and **Solution Overview**.

---

## [Context] Who We Are and Why This Project Exists

We are an AI application development team building practical systems, not just model demos.

In service environments, the gap is clear: many assistants can answer questions, but very few can reliably help complete operations. Customers change requests, context shifts quickly, and teams still need accurate handoff to backend workflows.

Lumina Live was created to close that gap.

> **What this section means:** We are solving an operations problem, not building a chatbot demo.

<!-- IMAGE: Team + product cover visual -->

---

## [Problem] The Real Problem We Target

Most conversational systems fail in live operations for three reasons:

- **Context drift:** they lose context when users interrupt or change intent.
- **Action gap:** they separate chat from actual UI and backend actions.
- **State mismatch:** they cannot maintain synchronized state across conversation, interface, and fulfillment.

So the key question became:

**How do we move from “AI can talk” to “AI can operate,” with launch-ready reliability?**

---

## [Scope] Our Scope (Intentionally Clear)

This article focuses on two areas:

1. **Google Cloud architecture and deployment**
2. **Gemini Live runtime behavior with guardrailed actions**

Out of scope: deep UI styling decisions, long business theory, and model benchmark comparisons.

> **Scope guardrail:** This article stays focused on architecture and runtime behavior.

---

## [Solution] Solution Overview: Lumina Live

Lumina Live is a real-time multimodal service agent.

It can:

- process voice sessions continuously,
- maintain conversational context,
- trigger explicit UI actions,
- and write consistent state to backend operations.

This gives teams a practical bridge from customer interaction to fulfillment flow.

> **Core message:** Lumina Live connects conversation to execution.

---

## [Demo] Flow (How to Present It Professionally)

For a Medium audience and hackathon judges, we present the demo in three layers:

1. **Intent capture**
   - user speaks naturally, including interruptions.
2. **Agent action**
   - Gemini Live interprets intent and triggers tool actions like `navigate_screen`, `highlight_item`, `add_to_cart`, and `show_payment`.
3. **Operational completion**
   - order/session state is updated in Firestore and reflected in UI/operations.

### Demo Snapshot (At a Glance)

| Stage | What Reader Should See | Proof Type |
|---|---|---|
| Intent capture | Natural speech + interruptions | Short live clip |
| Agent action | Tool calls triggered from model intent | UI interaction recording |
| Operational completion | Firestore + UI status updates | End-to-end demo video |

<!-- VIDEO: 30-45s live interruption + action execution clip -->
<!-- VIDEO: 2-3 min end-to-end scenario from first intent to completed order -->

---

## [Architecture] Google Cloud Architecture

We selected managed services to prioritize reliability and scale:

- **Cloud Run** for FastAPI backend (REST + WebSocket)
- **Firestore** for session and order lifecycle state
- **Artifact Registry** for backend image management
- **Secret Manager** for runtime credential handling
- **Firebase Hosting** for frontend delivery

Why this works well:

- clear service boundaries,
- independent frontend/backend release cycles,
- and autoscaling behavior without infrastructure overhead.

> **Architecture takeaway:** Managed services let us focus on product logic instead of infrastructure maintenance.

<!-- IMAGE: Main architecture diagram (assets/Lumina-Live-Agent-Diagram.png) -->
<!-- IMAGE CAPTION: End-to-end path from client interaction to backend actions and persisted state -->

---

## [Runtime] Gemini Live Runtime Design

Gemini Live is the intelligence layer, but not the safety boundary.

Runtime loop:

1. WebSocket session starts and streams user interaction.
2. Gemini Live interprets intent in context.
3. Backend validates and executes controlled tool actions.
4. Firestore persists synchronized state.
5. UI and operations remain aligned through status transitions (`pending`, `preparing`, `ready`).

This guardrailed design is important for production: model capability plus explicit action control.

> **Runtime takeaway:** The model decides intent; the backend controls execution.

<!-- IMAGE: Sequence diagram (voice -> Gemini Live -> tool call -> Firestore -> UI update) -->

---

## [Readiness] Launch Readiness and Scale

We designed the project for launch-readiness, not one-time demo execution.

Deployment path:

- build and push backend image to Artifact Registry,
- deploy to Cloud Run with Secret Manager bindings,
- build static frontend and publish to Firebase Hosting.

Scalability path:

- Cloud Run autoscaling for concurrent sessions,
- Firestore for managed, low-latency state sync,
- minimal ops overhead by staying within PaaS components.

One practical lesson: isolate secret mount paths from app import roots to avoid runtime conflicts.

> **Readiness takeaway:** This is deployable with autoscaling and repeatable release flow.

---

## [Hackathon] Evidence Package

To help judges evaluate quickly, we package four artifacts:

- **Architecture proof**: cloud diagram with boundaries and flow
- **Runtime proof**: live demo video with real tool invocation
- **Deployment proof**: Cloud Run and Firestore evidence snapshots
- **Reproducibility proof**: repository and setup documentation

This combination makes the project both technically credible and easy to assess.

> **Judge-friendly summary:** We provide architecture, runtime, deployment, and reproducibility proof.

---

## [Closing] Final Reflection

Our core belief is simple: practical AI impact starts when systems can execute reliably, not only converse fluently.

Lumina Live shows that with a disciplined Google Cloud foundation and a guardrailed Gemini Live runtime, teams can move from prototype assistant to real-time operational agent.

> **One-line conclusion:** From conversation to action, with cloud-scale reliability.
