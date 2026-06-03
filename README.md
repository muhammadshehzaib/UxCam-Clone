# UXClone — Open-Source Session Replay & Analytics

UXClone is a powerful, self-hosted session replay and user analytics platform inspired by UXCam. It allows developers to capture user interactions, visualize sessions through an event-based replay engine, and gain deep insights into user behavior.

<p align="center">
  <a href="https://REPLACE-WITH-YOUR-VPS-URL"><img src="https://img.shields.io/badge/Live%20Demo-Visit-2ea44f?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo"></a>
  <a href="https://github.com/muhammadshehzaib/UxCam-Clone"><img src="https://img.shields.io/badge/Source-GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js%2016-000000?logo=nextdotjs&logoColor=white" alt="Next.js 16">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Express-000000?logo=express&logoColor=white" alt="Express">
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Redis-DC382D?logo=redis&logoColor=white" alt="Redis">
  <img src="https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white" alt="Docker">
</p>

> 📸 **Add a screenshot / replay GIF here.** Drop an image at `docs/screenshot.png` and uncomment the block below.
<!--
<p align="center">
  <img src="docs/screenshot.png" alt="UXClone dashboard" width="850">
</p>
-->

---

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
git clone https://github.com/muhammadshehzaib/UxCam-Clone.git
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
- **Dashboard**: [http://localhost:3000](http://localhost:3000)
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
