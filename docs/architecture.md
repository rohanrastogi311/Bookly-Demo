# Architecture and implementation notes

## Architecture

```text
Browser chat / microphone
  -> transcription (ElevenLabs, optional)
  -> /api/chat: server-owned session and bounded OpenAI tool loop
  -> Bookly tools: lookup, policy, metadata matching and delivery checks
  -> pending proposal
  -> /api/confirm: independent eligibility, expiry, stock and revision checks
  -> atomic D1 write: resolution + inventory + session
  -> receipt and optional spoken response
```

- `lib/domain.ts`: catalogue, explicit demo policy, delivery eligibility and proposal validation.
- `lib/agent.ts`: system prompt, JSON tool schemas, direct model calls, tool dispatch and labelled rehearsal mode.
- `lib/store.ts`: durable sessions, inventory and transactional resolution writes.
- `lib/http.ts`: session cookie, identity scoping, same-origin writes and response helpers.
- `app/api/*`: narrow API routes for sessions, conversations, confirmation, scenarios and speech.
- `app/page.tsx`: responsive chat UI, recommendations, confirmation, receipts and tool activity.
- `app/pitch`: five-slide interactive solution pitch with print styling.
- `db/schema.ts` and `drizzle/`: schema and generated migration.
- `tests/`: policy, service, route and provider-protocol checks.

### Agent tools

| Tool | Responsibility |
| --- | --- |
| `list_orders` | Retrieve only the demo customer’s available orders. |
| `get_order` | Select and retrieve tracking/eligibility for one order. |
| `get_policy` | Retrieve versioned, fictional Bookly rules. |
| `find_alternatives` | Rank metadata similarity after checking feasibility. |
| `propose_resolution` | Prepare an expiring replacement/refund confirmation. It cannot execute it. |
| `escalate` | Record a simulated priority case and pause automated changes. |

### Decisions worth defending

**Feasibility before recommendation.** In-stock is insufficient: the synthetic quote checks dispatch delay, cutoff, service to the supported B1 destination, deadline and a no-charge price cap. The model explains relevant catalogue metadata. No vector database is needed for this small catalogue.

**Proposal and commit are separate.** The model has no tool that directly issues refunds or replacements. A separate confirmation endpoint binds approval to a specific order, item and resolution. Approval/help follow-ups retain the current proposal. A changed action, book or order invalidates it before external calls. Customers can approve through the pinned confirmation button or the exact named-action phrase “confirm replacement” / “confirm refund”; generic “yes” never executes an action. Quotes and confirmations expire after five minutes.

**Code authorizes changes.** The backend rechecks policy and inventory. A transaction writes the receipt, decrements replacement stock and updates the session together. Session revisions reject stale writes. A unique `(session_id, order_id)` constraint prevents multiple resolutions. Retrying the same token returns the existing receipt.

**Context before clarification.** The first live turn loads the signed-in account summary. A bounded tool-first turn gives the model a factual check before it answers; intent inference selects an order from that data, rather than changing its status to match a script. Truly ambiguous requests still prompt one focused question. Repeated session context and tool results carry across topic changes.

**Inspectable orchestration.** The tool loop has a six-call budget, external timeouts and provider errors. Tool outcomes and durations are observable; private model reasoning is not exposed. Typed and spoken inputs share the same session and state.

## Tests and verification

```bash
pnpm test
pnpm typecheck
pnpm build
```

The test suite currently contains **72 passing checks**: 18 domain tests, 41 service/route tests, 10 voice-turn/audio tests and 3 confirmation-language tests. Service tests execute the actual SQL through an in-memory SQLite adapter implementing the D1 interface. External provider replies are mocked in automated protocol tests; these tests do not prove live model or speech quality.

Browser verification covers the unified account order list, dynamic sidebar and conversation reset without losing existing resolutions. Live provider checks cover inferred gift intent, deadline-aware alternatives, order switching, shipped-order review, security handoff, clarification and confirmation. The optional `tests/integration.py` is a standalone HTTP runner for a **rehearsal-mode local server**. It is not used as evidence of a passed automated run in this environment.

## Assumptions and production changes

The customer is a single fictional Bookly account inside an owner-private demo. Hosting provides the access boundary and identity header; an opaque HttpOnly session cookie scopes each conversation. This does **not** claim production authentication against real Bookly orders. Do not make this site public with API credentials without adding authentication, rate limits and abuse controls.

A warehouse-delayed, unshipped order qualifies for either a full refund or one replacement priced at/below the original book. Bookly absorbs express shipping. Replacement cancels the original order. Shipped orders need human review; the prototype does not secretly create a second charge. One supported B1 service, UTC cutoff and no holiday calendar are deliberate simulation constraints.

The first production change would be authenticated order/warehouse/carrier integrations with stock reservations, real service promises, idempotency keys and a durable reconciliation workflow. Then add simultaneous barge-in with echo suppression, provider retries appropriate to the operation, and an evaluation corpus for grounded answers, clarification and escalation. Measure latency percentiles, customer effort and correct resolutions before claiming business uplift.

## Pitch

Open `/pitch` for the five-slide architecture and decision defense. Use its print action for a PDF, or use the separate editable PowerPoint deliverable. The deck’s speaker notes explain the trade-offs and demo boundaries.
