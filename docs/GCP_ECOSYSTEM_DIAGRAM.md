# GCP Ecosystem Diagram

This diagram reflects the production architecture of this project on Google Cloud Platform.

| Layer | GCP Product |
|---|---|
| Frontend Hosting | Firebase Hosting (static Next.js export, global CDN) |
| Backend Runtime | Cloud Run (FastAPI + WebSocket) |
| AI Provider | Gemini API (gemini-2.5-flash-native-audio-latest) |
| Database | Cloud Firestore (orders + sessions) |
| Secrets | Secret Manager |
| Identity | IAM Service Account |
| Observability | Cloud Logging + Cloud Monitoring |

```mermaid
flowchart LR
  subgraph Users
    Customer["Customer Kiosk Browser"]
    Kitchen["Kitchen Dashboard Browser"]
  end

  subgraph GCP["Google Cloud Platform"]

    subgraph FirebaseHostingLayer["Firebase Hosting"]
      FirebaseHosting["Firebase Hosting\nStatic Next.js export\nGlobal CDN edge cache"]
    end

    subgraph BackendRuntime["Cloud Run"]
      BackendCR["Cloud Run\nFastAPI + WebSocket server\nport 8080"]
    end

    GeminiAPI["Gemini API\n(Google AI Provider API)\ngemini-2.5-flash-native-audio-latest"]
    Firestore["Cloud Firestore\norders + sessions collections"]
    SecretMgr["Secret Manager\nGOOGLE_API_KEY\nservice account JSON"]
    IAM["IAM Service Account\nCloud Run runtime identity"]
    Ops["Cloud Logging\n+ Cloud Monitoring"]
  end

  Customer -->|"HTTPS – serves static JS bundle"| FirebaseHosting
  Kitchen  -->|"HTTPS – serves static JS bundle"| FirebaseHosting

  Customer -->|"WSS /ws\naudio + video + tool messages"| BackendCR
  Kitchen  -->|"HTTPS /kitchen/orders PATCH"| BackendCR

  BackendCR --> IAM
  BackendCR -->|"read secrets at startup"| SecretMgr
  BackendCR -->|"audio / video / text\n+ function calls"| GeminiAPI
  BackendCR -->|"create / update documents"| Firestore

  BackendCR --> Ops
  FirebaseHosting --> Ops
```
