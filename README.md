<div align="center">

# SyncPad

**A robust, real-time collaborative document editor built with Next.js, FastAPI, and Yjs CRDTs.**

[![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Yjs](https://img.shields.io/badge/Yjs-FF6C37?style=for-the-badge)](https://yjs.dev/)
[![Hocuspocus](https://img.shields.io/badge/Hocuspocus-000000?style=for-the-badge)](https://tiptap.dev/hocuspocus)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)

</div>

---

## Overview

SyncPad is a full-stack web application that allows multiple users to edit documents simultaneously in real-time. It leverages Conflict-Free Replicated Data Types (CRDTs) to ensure that document state remains consistent across all clients without requiring operational locking.

The application is split into three main layers:
1.  **Frontend (Next.js):** The user interface and text editor powered by Tiptap.
2.  **Sync Server (Hocuspocus/Node.js):** A WebSocket server that multiplexes Yjs CRDT document updates between connected clients.
3.  **Backend API (FastAPI):** A Python REST API handling user authentication, document persistence, and application logic.

---

## System Architecture

The following diagram illustrates the high-level architecture and how the three independent services interact with clients and databases.

```mermaid
graph TD
    Client[Browser Client]
    
    subgraph Frontend [Next.js Application]
        Web[Web UI & Editor Components]
    end
    
    subgraph RealTime [WebSocket Sync Server]
        HP[Hocuspocus Node.js Server]
        Redis[(Redis Pub/Sub)]
    end
    
    subgraph Backend [REST API Server]
        Fast[Python FastAPI]
        DB[(PostgreSQL Database)]
    end

    Client <-->|"HTTPS UI"| Web
    Client <-->|"WebSockets (ws://)"| HP
    Client <-->|"REST API (https://)"| Fast
    
    HP <-->|"State Synchronization"| Redis
    HP -->|"Webhooks / Auth"| Fast
    
    Fast <-->|"SQLAlchemy ORM"| DB
```

💡 **How it works (in simple terms):** Think of this as a restaurant. The **Frontend (Next.js)** is the dining area where users interact. The **Backend (FastAPI)** is the main kitchen that handles secure, slow-moving logic like user accounts and saving data to the database. The **Sync Server (Hocuspocus)** is the high-speed conveyor belt (WebSockets) that instantly passes live text edits back and forth between everyone's tables without making them wait for the main kitchen.

---

## Real-Time Collaboration Flow

When users collaborate on a document, their keystrokes are merged locally into a Yjs document and then transmitted to the Sync Server. The server broadcasts the changes to all other connected peers.

```mermaid
sequenceDiagram
    participant U1 as "User A (Client)"
    participant U2 as "User B (Client)"
    participant Y as "Local Yjs Doc"
    participant S as "Sync Server (Hocuspocus)"
    
    U1->>Y: Type text (Local Edit)
    Y->>U1: Instant UI Update
    Y->>S: Send CRDT Update (WebSocket payload)
    S->>S: Merge into Server-side Yjs Document
    S->>Y: Acknowledge receipt
    S->>U2: Broadcast CRDT Update
    U2->>U2: Merge into Local Yjs Document
    U2->>U2: Update UI for User B
```

💡 **How it works (in simple terms):** When two people edit the same document, they never have to "wait in line". If User A types a word, it shows up on their screen instantly. In the background, that word is packed into a tiny, mathematical message (a CRDT update) and sent to the Sync Server. The server acts like a traffic cop, broadcasting User A's word to User B's computer, where the algorithm seamlessly merges it into User B's screen without deleting what User B is currently typing.

---

## Authentication Flow

SyncPad uses secure JWT (JSON Web Token) authentication for the REST API, and integrates that token into the WebSocket connection handshake to ensure secure collaboration.

```mermaid
sequenceDiagram
    participant User as "User"
    participant NextJS as "Frontend (Next.js)"
    participant API as "Backend (FastAPI)"
    participant Sync as "Sync Server"
    
    User->>NextJS: Submit Login Credentials
    NextJS->>API: POST /token (OAuth2 Request)
    API-->>NextJS: Return Access Token (JWT)
    NextJS->>User: Save token in local storage / cookies
    
    User->>Sync: Connect WebSocket with Token URL Param
    Sync->>API: Webhook (Verify Token Validity)
    API-->>Sync: Return Authorized & User Profile Info
    Sync-->>User: Connection Established
```

💡 **How it works (in simple terms):** To keep your documents completely private, we use a digital bouncer (JWT Authentication). When you log in, the Backend verifies your password and gives your browser a secure "VIP wristband" (a token). Later, when your browser tries to connect to the live-editing Sync Server, the server checks that wristband with the Backend before opening the WebSocket doors.

---

## Data Persistence & Entity Models

Document metadata and user profiles are stored in a relational PostgreSQL database using SQLAlchemy. The actual CRDT state vectors are stored as binary blobs.

```mermaid
erDiagram
    USER ||--o{ DOCUMENT : "owns"
    USER {
        int id PK
        string email
        string hashed_password
        boolean is_active
    }
    DOCUMENT ||--o{ SNAPSHOT : "contains"
    DOCUMENT {
        string id PK
        string title
        string owner_id FK
        boolean is_public
        bytes yjs_state
        datetime updated_at
    }
    SNAPSHOT {
        int id PK
        string document_id FK
        string name
        bytes state
        datetime created_at
    }
```

💡 **How it works (in simple terms):** This is how we organize the digital filing cabinet in our PostgreSQL database. A **User** can own multiple **Documents**. Every Document stores the live, collaborative text as binary data (`yjs_state`). To enable our "Time-Travel" feature, a Document can also have multiple **Snapshots**, which are frozen, historical copies of the text from specific points in time.

---

## Key Features

*   **Real-time Synchronization:** Peer-to-peer style document editing via WebSockets.
*   **Offline Support:** Yjs CRDTs natively support offline edits that merge perfectly upon reconnection.
*   **Version History:** Save document states as snapshots and restore them at any time.
*   **Share & Permissions:** Secure links to invite collaborators.
*   **Telemetry Dashboard:** Monitor active peers and connection latency.
*   **AI Co-Author:** Highlight text to seamlessly improve, summarize, or rewrite using backend AI endpoints.

---

## Quick Start

### 1. Start Infrastructure (Docker)
Ensure you have Docker and Docker Compose installed.
```bash
docker-compose up -d
```
*This starts PostgreSQL and Redis.*

### 2. Start the Backend API (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --port 8000 --reload
```

### 3. Start the Sync Server (WebSockets)
```bash
cd apps/server
npm install
npm run dev
```

### 4. Start the Frontend (Next.js)
```bash
cd apps/web
npm install
npm run dev
```
*Access the application at `http://localhost:3000`.*
