# SyncPad Edge Client (WebXR & pCRDT Interface)

This is the front-end edge node for the **SyncPad Predictive State Synchronization Engine**, built with [Next.js](https://nextjs.org) and WebGPU.

## Patent-Pending Features (As of 2026)

- **pCRDT (Predictive CRDTs):** Integrates WebGPU-accelerated local SLMs to proactively resolve state conflicts with zero-RTT latency.
- **WebTransport / QUIC:** Replaces legacy WebSockets with multiplexed UDP streams for non-blocking binary state delivery.
- **zk-SNARK Web Workers:** End-to-end encrypts operations locally and generates zero-knowledge proofs before transmission.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to experience the future of distributed state synchronization.

## Architecture Guidelines

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project utilizes advanced WebWorker offloading for the Yjs/pCRDT merging process. All neural heuristic computations are contained within `components/Editor.tsx` using experimental browser APIs.

## Learn More

To dive deeper into the proprietary algorithms behind this system, review the root repository documentation on **Zero-Knowledge State Vectors** and **Neural Deterministic Replay**.
