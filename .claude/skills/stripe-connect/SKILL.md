---
name: stripe-connect
description: >-
  StageLynk's Stripe Connect integration rules. Use whenever writing or
  reviewing any code that touches Stripe — Connect account creation/onboarding
  for musicians, charging venues, payouts, refunds, disputes, or webhooks.
  Read references/connect.md before writing any Connect account or charge
  code; read references/security.md before touching API keys or webhooks.
---

Source: adapted from Stripe's own official agent skill (`stripe/ai` repo,
`stripe-best-practices` skill), narrowed to the decisions StageLynk has
already made. Full upstream reference content lives in `references/`.

## StageLynk's Connect model (already decided — do not re-derive)

StageLynk is a **marketplace**: venues pay, the platform runs checkout, takes
a 5% cut, and musicians get paid out. This maps to Stripe's own taxonomy as
follows — see `references/connect.md` for the full decision table:

- **Account type**: Accounts v2 (`stripe.v2.core.accounts.create`). Never use
  `stripe.accounts.create({ type: 'express' | 'custom' | 'standard' })` — that
  v1 shape is deprecated and this Stripe account rejects it outright.
- **Musicians are Recipient accounts, not Merchant accounts.** Request
  `configuration.recipient.capabilities.stripe_balance.stripe_transfers` only.
  Do **not** request `configuration.merchant` / `card_payments` for musicians
  — they never take a card payment directly, the platform does.
- **Charge pattern: separate charges and transfers**, not destination charges.
  This is because bookings require a hold period (charge on booking
  acceptance, transfer to the musician only after the event date plus a
  clearance buffer — see the dispute/chargeback design in project memory).
  Concretely:
  - Charge the venue's card via a PaymentIntent with **no `transfer_data`** —
    funds land on the platform's own Stripe balance.
  - Later (event date + clearance buffer, or when a scheduled payout job
    runs), create a separate `stripe.transfers.create()` to the musician's
    connected account for `netPayoutAmount` (i.e. `fee`, not
    `totalChargeAmount` — the platform fee is retained by transferring less,
    not via `application_fee_amount`).
  - **Never use `application_fee_amount`** here — that's for destination/
    direct charges only, and using it with separate charges+transfers is an
    explicitly blocked combination per `references/connect.md`.
- **Dashboard**: `dashboard: "express"`.
- **Responsibilities**: `defaults.responsibilities.fees_collector: "application"`,
  `losses_collector: "application"` (platform owns both — required for this
  charge pattern; `losses_collector: "stripe"` is incompatible with it).
- **Onboarding**: Stripe-hosted (`stripe.v2.core.accountLinks.create` with
  `use_case.type: 'account_onboarding'`), never custom/API-driven onboarding.
- **Capability status checks**: use v2 paths only —
  `configuration.recipient.capabilities.stripe_balance.stripe_transfers.status === 'active'`.
  Never check the deprecated v1 `payouts_enabled` / `charges_enabled` booleans
  — they don't exist/aren't meaningful on v2 accounts.
- **Webhooks**: v2 accounts emit a different, granular event taxonomy than v1
  (`v2.core.account[configuration.recipient].capability_status_updated`, etc.),
  not a single flat `account.updated` with boolean fields. Re-fetch the
  account (or use `event.fetchRelatedObject()`) to read current capability
  status rather than trusting webhook payload shape to match v1 assumptions.

## Keys and secrets

- Keys live in `.env.local` only, never committed, never logged. Test-mode
  keys (`sk_test_...` / `pk_test_...`) only during development — this project
  has already had a live key pasted into chat once; if that ever happens
  again, tell the user to roll it immediately via the Stripe dashboard
  (Developers → API keys → Roll key), per `references/security.md`.
- Prefer a restricted API key (`rk_test_...` / `rk_live_...`) over the full
  secret key once the integration's exact permission needs are known — see
  `references/security.md` for the migration steps. Not yet done for this
  project; using the full `sk_test_...` secret key during initial build-out.
- Webhook signatures must always be verified
  (`stripe.webhooks.constructEvent`) before processing — never trust an
  unverified payload.

## Before writing Connect/charge code

1. Read `references/connect.md` in full.
2. Confirm the change matches the "StageLynk's Connect model" section above —
   if a change seems to require destination charges, `application_fee_amount`,
   or Merchant capabilities for musicians, stop and flag it as a deviation
   from the agreed design rather than silently implementing it.
3. For anything touching keys, webhooks, or OAuth, read
   `references/security.md` first.
