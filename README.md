# UXClone - Open Source Session Replay & Analytics

UXClone is a powerful, self-hosted session replay and user analytics platform inspired by UXCam. It allows developers to capture user interactions, visualize sessions through an event-based replay engine, and gain deep insights into user behavior.

## 🚀 Features

- **Session Replay**: Visualize user journeys with a custom event-marker replay engine.
- **Event Tracking**: Capture clicks, scrolls, navigation, and custom events with zero-dependency SDK.
- **Analytics Dashboard**: Real-time summary of active users, session duration, and top screens.
- **Multi-Tenant Ready**: Project-based isolation for managing multiple applications.
- **Privacy First**: Built-in PII masks ensure sensitive user data never leaves the client.
- **Performance Optimized**: Materialized views and Redis caching for sub-second dashboard queries.

## 🛠 Tech Stack

- **Frontend**: Next.js 16.2.1 (App Router), Tailwind CSS, Lucide Icons
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL 16 (Primary Store)
- **Cache**: Redis 7 (Rate Limiting & Session Buffering)
- **Deployment**: Docker & Docker Compose

## 🏃 Quick Start

The fastest way to get UXClone running is using Docker Compose.

### 1. Clone the repository
```bash
git clone <repository-url>
cd UxCam-Clone
```

### 2. Setup environment variables
```bash
cp .env.example .env
```

### 3. Start the platform
```bash
# This starts Postgres, Redis, the API, and the Dashboard
docker-compose up -d --build
```

### 4. Access the services
- **Dashboard**: [http://localhost:3009](http://localhost:3009)
- **API Server**: [http://localhost:3001](http://localhost:3001)

---

## 💻 Development

### Running Migrations
If you make changes to the database schema, run the migrations from the root:
```bash
docker exec -it uxclone-api npm run migrate
```

### Test Harness
To generate synthetic data for testing:
1. Open `sdk/dev/test-harness.html` in your browser.
2. Click "Start Session" and interact with the page.
3. Refresh the Dashboard to see your session appear.

## Testing on a mobile phone
UXCam is a **mobile SDK**, but the **dashboard is a web app**. To test UXClone with a real phone, you usually do:

1) Open the dashboard on your phone (same Wi‑Fi as your computer)
2) Send events from the phone (either via the browser harness, or by integrating the Android/iOS/React‑Native SDK into a test app)

### A) View the dashboard on your phone
1. Start services: `docker-compose up -d --build`
2. Find your computer’s LAN IP (Windows): `ipconfig` → `IPv4 Address` (example: `192.168.1.50`)
3. On your phone (same Wi‑Fi), open: `http://YOUR_LAN_IP:3009`

### B) Send test sessions from your phone (browser)
1. Build the web SDK bundle: `npm --prefix sdk run full-build`
2. Serve the `sdk` folder (so `dev/` and `dist/` are both reachable):
   - `cd sdk`
   - `python -m http.server 8000`
3. On your phone, open: `http://YOUR_LAN_IP:8000/dev/test-harness.html`
4. Paste your project API key and click **Init SDK** / **Generate Synthetic Session**.

If Windows Firewall blocks access, allow inbound TCP for ports `3001`, `3009`, and `8000`.

## 🏗 Architecture

```mermaid
sequenceDiagram
    participant SDK as JS SDK (Client)
    participant API as Express API
    participant Redis as Redis (Buffer)
    participant DB as Postgres (Storage)
    participant Dash as Next.js Dashboard

    SDK->>API: POST /session/start
    API->>Redis: Buffer Session Metadata
    SDK->>API: POST /ingest/batch (Events)
    API->>DB: Bulk Insert Events
    API->>DB: Atomic increment event_count
    SDK->>API: POST /session/end
    API->>Redis: Flush & Compute Duration
    API->>DB: Finalize Session Record
    
    Dash->>API: GET /analytics/summary
    API-->>Dash: Return Cached JSON (60s TTL)
```

## 📂 Project Structure

- `frontend/`: Next.js dashboard and replay viewer.
- `backend/`: Express API server and database services.
- `sdk/`: Vanilla TypeScript library for client-side recording.
- `docker-compose.yml`: Infrastructure orchestration.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
