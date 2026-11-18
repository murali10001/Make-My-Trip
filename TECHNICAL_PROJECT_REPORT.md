# MakeMyTour: Enterprise-Grade Full-Stack Travel Platform
## Final Internship Technical Project & Implementation Report

---

### Executive Summary

| Attribute | Specification |
|---|---|
| **Project Title** | MakeMyTour Full-Stack Travel & Hospitality Platform |
| **Domain** | Cloud-Native Travel Booking, Real-Time Telemetry & Recommendation Systems |
| **Backend Architecture** | Spring Boot 3.4.1 (Java 17), RESTful Micro-Services Pattern, Spring Security |
| **Data Layer** | MongoDB Atlas, Spring Data MongoDB, Document Persistence, TTL Indexes |
| **Frontend Architecture** | Next.js 15 (React 19), TypeScript 5, Tailwind CSS, Radix UI Primitives, Redux Toolkit |
| **Real-Time Streaming** | Server-Sent Events (`SseEmitter`), Scheduled Background Task Daemons (`@Scheduled`) |
| **Quality & Resilience** | Automated E2E Regression (Playwright), JUnit 5 Integration Testing, Global Controller Advice |

---

## 1. System Architecture & High-Level Design

The **MakeMyTour** platform is engineered as a decoupled, multi-tiered enterprise application designed for high availability, low-latency client rendering, and resilient data consistency across distributed states.

```mermaid
flowchart TD
    subgraph Client Tier ["Next.js 15 Client Tier (Vercel)"]
        UI["React 19 SSR / CSR & Tailwind CSS"]
        State["Redux Toolkit Global State"]
        SSE_Client["EventSource / SSE Client"]
    end

    subgraph Gateway ["HTTP / REST & Streaming Gateway"]
        CORS["CORS Filter & Security Config"]
        REST["REST API Controllers (Port 8081)"]
        SSE_Hub["SseEmitter Streaming Hub"]
    end

    subgraph Service Tier ["Spring Boot 3.4 Core Engine"]
        FlightService["Flight & Radar Service"]
        PricingService["Multi-Factor Dynamic Pricing Engine"]
        SelectionService["Concurrency-Controlled Seat/Room Allocator"]
        RefundService["Policy-Driven Cancellation Engine"]
        ReviewService["UGC Review & Moderation Queue"]
        RecService["Hybrid Recommendation Engine"]
    end

    subgraph Schedulers ["Background Daemon Schedulers"]
        FlightSched["FlightStatusScheduler (5s polling delta)"]
        RefundSched["RefundStatusScheduler (2s state machine)"]
    end

    subgraph Storage ["Persistence Layer (MongoDB Atlas)"]
        MongoUsers[("Users & Bookings")]
        MongoFlights[("Flights & SeatMaps")]
        MongoPricing[("DynamicPrices & PriceFreezes (TTL)")]
        MongoRefunds[("RefundRequests")]
        MongoReviews[("Reviews & Moderation")]
        MongoRecs[("RecommendationCatalog & Feedback")]
    end

    UI -->|HTTPS / REST| REST
    SSE_Client -->|Persistent Streaming Connection| SSE_Hub
    REST --> Service Tier
    SSE_Hub -.-> Service Tier
    Schedulers --> Service Tier
    Service Tier --> Storage
```

---

## 2. Deep-Dive Technical Feature Implementation (Tasks 1–6)

### Task 1: Real-Time Flight Telemetry & Multi-Flight Radar System

#### 1. Technical Implementation
* **Asynchronous Event-Driven Broadcasts:** Engineered using Spring's `SseEmitter` streaming abstraction over persistent HTTP connections.
* **Delta-State Polling Mechanism:** The background worker (`FlightStatusScheduler`) runs at a fixed rate of `5000ms`. Rather than broadcasting periodic duplicate payloads, the service computes a state delta (`validateAndSyncChangedFlights`) and selectively emits payloads only when a flight transitions state (`ON_TIME` $\rightarrow$ `DELAYED` $\rightarrow$ `BOARDING` $\rightarrow$ `LANDED`).
* **Dynamic ETA & Schedule Recalculation:** Telemetry engines ingest delay minutes, parse 12/24-hour timestamp patterns with zone preservation (`Asia/Kolkata`), and recompute estimated arrival timelines on the fly.
* **Batch Multi-Flight Tracking:** Exposes a high-throughput multiplexed endpoint (`POST /api/flight-status/tracked`) allowing concurrent observation of distinct flight numbers within a single request context.

#### 2. Key Engineering Decisions & Challenges Overcome
* **Broadcast Storm Mitigation:** Eliminated client-side re-render thrashing by replacing generic WebSocket broadcasting with targeted SSE delta event channels.
* **Graceful Emitter Lifecycle:** Implemented `ConcurrentHashMap` and `CopyOnWriteArrayList` registries with explicit `onCompletion`, `onTimeout`, and `onError` cleanup hooks to prevent memory leaks from abandoned client sockets.

---

### Task 2: Multi-Factor Dynamic Pricing Engine & TTL Price Freeze Lock

#### 1. Mathematical Surge Algorithm
The dynamic price $P_{\text{final}}$ is determined through a composite multi-factor surge function:

$$P_{\text{final}} = \operatorname{round}\left( P_{\text{base}} \times \left(1 + \frac{\Delta_{\text{demand}} + \Delta_{\text{season}}}{100}\right) \times M_{\text{departure}} \right)$$

Where:
* **$\Delta_{\text{demand}}$ (Inventory Scarcity):**
  * Seats $\le 25 \implies +15\%$
  * Seats $\le 70 \implies +5\%$
* **$\Delta_{\text{season}}$ (Calendar Volatility):**
  * `HOLIDAY_PEAK` $\implies +20\%$
  * `WEEKEND` $\implies +10\%$
* **$M_{\text{departure}}$ (Urgency Multiplier):**
  * $T_{\text{departure}} < 24\text{ hours} \implies \times 1.25$
  * $24\text{h} \le T_{\text{departure}} \le 72\text{h} \implies \times 1.15$
  * $72\text{h} < T_{\text{departure}} \le 168\text{h} \implies \times 1.05$

#### 2. Price Freeze Architecture
* **Cryptographic Lock Session:** When a client freezes an active quote, a `PriceFreeze` document is persisted with an immutable token (`FRZ-XXXX`), captured price, and a strict 24-hour expiration timestamp (`expiresAt`).
* **Integrity Validation:** Upon booking checkout, the system validates the session against MongoDB. If expired or non-existent, a custom `PriceFreezeExpiredException` or `PriceFreezeNotFoundException` halts checkout, enforcing pricing integrity.
* **Volatility Analysis:** Renders a 7-day rolling historical pricing matrix comparing internal volatility against mock competitor baselines (`MakeMyTrip`, `EaseMyTrip`, `Yatra`).

---

### Task 3: Policy-Driven Cancellation Engine & Asynchronous Refund State Machine

#### 1. Policy Decision Matrix
Refund eligibility is calculated server-side based on the remaining delta until departure ($T_{\text{remaining}} = T_{\text{scheduled}} - T_{\text{cancellation}}$):

$$\text{Refund Percentage} = 
\begin{cases} 
90\% & \text{if } T_{\text{remaining}} > 72\text{ hours (Flexible Advance Policy)} \\
75\% & \text{if } 24\text{ hours} \le T_{\text{remaining}} \le 72\text{ hours (Standard Policy)} \\
50\% & \text{if } T_{\text{remaining}} < 24\text{ hours (Last-Minute Policy)}
\end{cases}$$

#### 2. Asynchronous State Machine Workflow
To decouple long-running financial settlement simulations from client-facing transactions:
1. **Submission (`Step 1 - REQUESTED`):** The booking status switches to `CANCELLED`, reserving cancellation reasons against a server-validated enum (`PREDEFINED_REASONS`).
2. **State Progression Daemon (`RefundStatusScheduler`):** Polling every `2000ms`, the daemon evaluates elapsed epoch time per request:
   * $\Delta t \ge 3000\text{ms} \implies \text{Status} \rightarrow \mathbf{APPROVED}$ (`Step 2`)
   * $\Delta t \ge 4000\text{ms} \implies \text{Status} \rightarrow \mathbf{PROCESSING}$ (`Step 2`)
   * $\Delta t \ge 5000\text{ms} \implies \text{Status} \rightarrow \mathbf{COMPLETED}$ (`Step 3`)
3. **Atomic Inventory Restoration:** Upon cancellation commitment, `restoreInventory()` replenishes flight seat capacities or hotel room allocations automatically.

---

### Task 4: Interactive Cabin Topology, 3D Spatial Models & Concurrency Control

#### 1. Aircraft Seat Map & Concurrency Protection
* **Cabin Layout:** Dynamic generation of 72-seat matrices segmented across standard, extra-legroom, and exit-row classes with additive pricing addons.
* **Race Condition Mitigation:** Real-time seat reservation enforces validation before persistence. If a target seat's status is already `OCCUPIED`, the backend immediately rejects the operation with a `SeatUnavailableException`, mapping to HTTP **409 Conflict**.
* **Live SSE Mesh:** Upon successful reservation, `broadcastSeatUpdate()` pushes delta events to all active clients viewing the seat map, invalidating stale UI states in real time.

#### 2. 3D Spatial Room Tier Showcases
* **Hierarchical Room Modeling:** Backed by `RoomTypeOption` entities supporting `Room3dConfig` schemas—defining camera presets (FOV, azimuth, polar angle), furniture coordinates, and directional lighting profiles.
* **User Preferences Persistence:** Implemented cross-session preference persistence in MongoDB via `UserPreferencesRepository`. Traveler seat assignments (e.g., `Window / 1A`) and room tiers automatically seed subsequent booking journeys.

---

### Task 5: User-Generated Content (UGC) Review Architecture & Content Moderation

#### 1. Polymorphic Review Aggregation
* **Document Model:** `Review` documents support polymorphic targets (`HOTEL` or `FLIGHT`) with verified booking badges, 1–5 star ratings, and review response threads.
* **High-Performance Aggregation:** Computes on-the-fly summary analytics via `ReviewSummaryDTO`, calculating weighted average scores, star frequency distributions, and total attached photo counts.
* **Multipart Binary Handling:** Implements file-system binary storage under `uploads/reviews/` using standard Java NIO paths with UUID-safe collision prevention.

#### 2. Trust, Safety & Moderation Queue
* **Anti-Spam Vote Deduplication:** Prevents duplicate upvoting through in-memory set hashing of voter IDs (`Set<String>`).
* **Quarantine Pipeline:** Flagged reviews (`isFlagged = true`) are instantly excluded from public endpoints via MongoDB query filters and routed into a dedicated administrative moderation queue (`/api/reviews/moderation/flagged`) for approval, dismissal, or permanent purge.

---

### Task 6: Hybrid Recommendation Engine & Explainable AI (XAI)

#### 1. Recommendation Algorithm
The `RecommendationService` applies a hybrid heuristic scoring model combining content clustering and collaborative behavioral signals:

1. **Automated Keyword Clustering:** Catalogs accommodations by scanning metadata into thematic centroids:
   * *Beach:* Goa, Bali, Kerala, Maldives
   * *Heritage:* Jaipur, Udaipur, Palace, Haveli, Fort
   * *Nature:* Manali, Shimla, Munnar, Ooty
   * *Luxury:* 5-star ratings, premium price brackets
2. **Collaborative Metric Weighting:** Evaluates historical user booking vectors ($V_{\text{user}}$) against item feature vectors ($V_{\text{target}}$) to calculate affinity match percentages ($0\% - 99\%$).

#### 2. Transparency & Closed Feedback Loop
* **Explainability Tooltip ("Why this recommendation?"):** Each card returns a reasoning string detailing exact match factors (e.g., *"Based on your previous interest in beach resorts & 5-star rated properties"*).
* **Closed-Loop Tuning:** Incorporates a `RecommendationFeedback` repository capturing implicit and explicit user sentiment (helpful upvotes vs. irrelevance dismissals) to calibrate category weights dynamically.
* **Responsive Layout:** Engineered with Tailwind responsive design primitives (`sm`, `md`, `lg`, `xl`), adaptive navigation drawers, fluid CSS grids, and zero horizontal overflow across mobile, tablet, and desktop viewports.

---

## 3. Resilience, Security & Error Handling Matrix

| Exception Class | HTTP Status | Trigger Condition | Architectural Mitigation |
|---|---|---|---|
| `SeatUnavailableException` | **409 Conflict** | Concurrent collision on already booked seat | Prevents double-booking; triggers client-side seat map refresh |
| `PriceFreezeExpiredException` | **410 Gone** | Checkout attempted on expired TTL fare lock | Forces recalculation against current live market price |
| `CancellationNotAllowedException`| **400 Bad Request**| Duplicate cancellation attempt on cancelled ticket | Idempotent state verification protects financial ledgers |
| `InvalidReviewException` | **400 Bad Request**| Malformed rating, empty payload, or blank review | Strict server-side bean & business validation |
| `RefundNotFoundException` | **404 Not Found** | Querying nonexistent refund reference | Graceful fallback response prevents thread crash |
| `GlobalExceptionHandler` | **500 Internal** | Unhandled internal runtime exception | Standardized `ApiErrorResponse` DTO prevents stack trace leaks |

---

## 4. Verification & Testing Summary

* **Unit & Integration Test Coverage:** Executed comprehensive test suites across `BookingServiceTest`, `PricingServiceTest`, `RefundServiceTest`, and `RecommendationServiceTest`.
* **Automated QA & E2E Validation:** Validated via automated headless regression scripts (`run_comprehensive_qa.ps1`, `e2e_personalization_test.js`) confirming:
  * 100% pass rate across 14 end-to-end personalization and isolation test suites.
  * Zero console errors during cross-session preference reload.
  * Strict database isolation between distinct user sessions.
* **Production Deployment:** Live client bundle verified on Vercel; REST and SSE microservice backend live on cloud infrastructure with MongoDB Atlas cluster connectivity.

---

## 5. Conclusion & Submission Sign-Off

The **MakeMyTour** platform demonstrates a complete, production-grade integration of modern reactive frontends with a robust, concurrent, and policy-governed Spring Boot backend. All six assigned internship features were successfully developed, verified, containerized, and deployed in accordance with the official program guidelines.
