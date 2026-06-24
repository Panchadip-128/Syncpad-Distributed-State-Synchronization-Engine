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

**High-Level Overview:** Think of this as a restaurant. The **Frontend (Next.js)** is the dining area where users interact. The **Backend (FastAPI)** is the main kitchen that handles secure, slow-moving logic like user accounts and saving data to the database. The **Sync Server (Hocuspocus)** is the high-speed conveyor belt (WebSockets) that instantly passes live text edits back and forth between everyone's tables without making them wait for the main kitchen.

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

**High-Level Overview:** When two people edit the same document, they never have to wait in line. If User A types a word, it shows up on their screen instantly. In the background, that word is packed into a tiny, mathematical message (a CRDT update) and sent to the Sync Server. The server acts like a traffic cop, broadcasting User A's word to User B's computer, where the algorithm seamlessly merges it into User B's screen without deleting what User B is currently typing.

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

**High-Level Overview:** To keep your documents completely private, we use secure JWT Authentication. When you log in, the Backend verifies your password and gives your browser a secure access token. Later, when your browser tries to connect to the live-editing Sync Server, the server verifies that token with the Backend before opening the WebSocket connection.

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

**High-Level Overview:** This describes the entity-relationship model in our PostgreSQL database. A **User** can own multiple **Documents**. Every Document stores the live, collaborative text as binary data (`yjs_state`). To enable our Time-Travel feature, a Document can also have multiple **Snapshots**, which are frozen, historical copies of the text from specific points in time.

---

## Key Features

*   **Real-time Synchronization:** Peer-to-peer style document editing via WebSockets.
*   **Offline Support:** Yjs CRDTs natively support offline edits that merge perfectly upon reconnection.
*   **Version History:** Save document states as snapshots and restore them at any time.
*   **Share & Permissions:** Secure links to invite collaborators.
*   **Telemetry Dashboard:** Monitor active peers and connection latency.
*   **Smart Tables:** Full interactive table support (Tiptap tables). Users can insert, format, modify, and delete rows and columns dynamically in the editor.
*   **Voice Dictation:** Live, real-time speech-to-text dictation integrated into the formatting toolbar, utilizing the Web Speech API to write directly at the cursor.
*   **AI Copilot Sidebar:** A dedicated conversational side panel that reads the active document context, enabling users to chat, ask for ideas, summarize sections, and insert responses directly into the text with a single click.
*   **AI Co-Author:** Highlight text to improve, summarize, rewrite, continue writing, or fix grammar instantly using backend AI services.
*   **Multiplayer Laser Canvas:** Real-time cooperative laser pointer and freehand drawing mode (`Ctrl+Shift+L`). Cursors with username tags and fading sketches sync across peers instantly via WebSocket awareness fields and disappear in 2 seconds.
*   **Interactive Code Sandbox:** Collaborative, inline JS & Python playground node (via `/sandbox`). JavaScript runs directly in the browser's sandbox, while Python is executed securely via our FastAPI backend subprocess runner. Both code edits and stdout outputs are synchronized in real-time across active collaborators.

---

## AI Features Quality & Accuracy Metrics

To maintain a production-grade AI co-authoring experience, the repository features an automated benchmarking and evaluation suite located at `backend/evaluate_ai_features.py`. 

### Evaluation Methodology
The evaluation suite runs programmatic test datasets through each AI writing action and uses a **LLM-as-a-Judge** architecture (using Llama 3.3 70B via Groq) to grade response quality. Each test case is evaluated on a hybrid set of metrics:
1.  **Rule-based constraints:** e.g., verifying if summaries are strictly $\le 15$ words, or if "make shorter" reduces the character count by at least 40%.
2.  **LLM-graded quality:** Llama-3.3 rates correctness, tone, and contextual alignment on a scale of 1 to 10.
3.  **Result verification:** Test cases must pass both the rule-based length constraints and score $\ge 7/10$ on the LLM quality scale to be counted as fully accurate.

### Benchmark Results
Below is the evaluation report of the LLM-as-a-Judge test run across all six AI writing capabilities:

| AI Action | Evaluation Target | Constraint Check | LLM Quality Score | Action Accuracy |
| :--- | :--- | :--- | :--- | :--- |
| **Summarize** | Core summary extraction | $\le 15$ words | $\ge 7/10$ | **75.00%** |
| **Make Shorter** | Condense text | $\le 60\%$ length | $\ge 7/10$ | **100.00%** |
| **Rewrite** | Rewrite professionally | N/A | $\ge 7/10$ | **80.00%** |
| **Improve Writing** | Elevate flow and vocabulary | N/A | $\ge 7/10$ | **80.00%** |
| **Continue Writing** | Seamless autocompletion | 1-2 sentences | $\ge 7/10$ | **100.00%** |
| **Fix Grammar** | Correct spelling/grammar | N/A | Perfect fix | **90.00%** |
| **Overall average** | **System-wide AI performance** | — | — | **87.50%** |

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
