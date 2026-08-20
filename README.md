# Support Ticket & SLA Tracker

A high-performance, full-stack Support Ticket system with a robust Service Level Agreement (SLA) calculator.

Built using **Bun**, **GraphQL Yoga**, **Prisma**, **PostgreSQL**, and **React** with a "Linear-tier" aesthetic.

## Quick Start

### Prerequisites
- [Docker Desktop](https://www.docker.com/) running locally.
- [Bun](https://bun.sh/) installed.

### Installation & Run

1. **Start the Database**
   ```bash
   docker compose up -d
   ```
   *Wait a few seconds for the `(healthy)` check to pass on the Postgres container.*

2. **Install Dependencies**
   ```bash
   bun install
   ```

3. **Migrate & Seed the Database**
   ```bash
   cd packages/database
   bun run db:migrate --name init
   bun run db:seed
   ```

4. **Start the Application**
   ```bash
   bun run dev
   ```
   - **Frontend:** http://localhost:5173
   - **GraphQL API:** http://localhost:4000/graphql

---

## The SLA Engine (Core Architecture)

The SLA Engine is designed as a **purely functional, isolated module** (`packages/sla-engine`). It does not rely on Prisma or the GraphQL API, allowing us to unit test the complex time-math independently.

- SLA `firstResponseDueAt` and `resolutionDueAt` are computed **exactly once** at ticket creation by skipping weekends, non-business hours (18:00 - 09:00), and holidays. 
- SLA States (`ON_TRACK`, `AT_RISK`, `BREACHED`) are calculated dynamically at query-time.
- **Freeze Logic:** If an agent comments, the `firstResponseAt` timestamp is stamped. Querying the ticket later will respect this timestamp, freezing the SLA state forever so a completed SLA never degrades into "breached" as time passes.

---

## Architectural Decisions & Tradeoffs

To deliver a Senior/Staff-level application within the time budget, several specific tradeoffs were made:

### 1. SLA State Filtering vs. Cursor Pagination
Because the `slaState` is computed dynamically at query-time (since "now" is constantly moving), it cannot be cleanly indexed or filtered natively in PostgreSQL without heavy recurring batch jobs.
**Tradeoff:** When a user filters tickets by `slaState`, the GraphQL resolver intentionally "over-fetches" up to 5x the requested page limit from Prisma, computes the SLA state in-memory, filters the results, and returns the requested slice. This maintains the GraphQL pagination contract (`hasNextPage`) while avoiding massive DB overhead.

### 2. URQL instead of Apollo Client
URQL was chosen for the frontend because it provides a significantly leaner bundle size and a simpler, less aggressive caching model. Given the straightforward data needs of this ticket tracker, Apollo's extensive cache-normalization overhead was unnecessary.

### 3. JWT Storage (Security)
Currently, the JWT is stored in `localStorage` for simplicity in this take-home context. 
**Tradeoff:** `localStorage` is vulnerable to Cross-Site Scripting (XSS). In a true production environment with more time, I would implement **httpOnly cookies** securely set by the GraphQL Yoga context to completely immunize the auth flow against XSS token theft.

### 4. N+1 Query Prevention
The GraphQL resolvers do not eagerly fetch relations or rely on native Prisma nested queries for nested lists. Instead, we instantiate per-request `DataLoader` instances inside the Yoga context. This securely batches queries for `Assignees`, `Reporters`, and `Comments`, preventing the N+1 problem from destroying database performance on list views.

---

## Testing

This repository includes both pure unit tests (for the math) and end-to-end integration tests (for the API).

1. **SLA Math Unit Tests**
   ```bash
   cd packages/sla-engine
   bun test
   ```
   *Exhaustively tests Friday 17:59 rollovers, weekend skipping, holidays, and strict 75.00% boundaries.*

2. **GraphQL API Integration Tests**
   ```bash
   cd apps/api
   bun test
   ```
   *Tests strict RBAC rules, invalid status transitions, and complex SLA-stamping lifecycles against the database.*
