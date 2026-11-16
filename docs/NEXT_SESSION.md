# Snake demo — Next Session Planning

**Last Updated:** 2026-11-16
**Author:** Clead (Tech Owner)
**Purpose:** Staging area for reasoning, revised assumptions, and plan-adaptation thoughts that aren't yet mature enough to be a PBI, a decision, a strategy update, or a vision-doc change. Complements `docs/BACKLOG.md` — it does not replace it. Discrete, scoped, actionable work belongs in the backlog as a PBI, not here.

**The rule that keeps this useful, not a junk drawer:** every entry below must get a disposition each session it's touched — promoted to a PBI, a decision, or a formal doc update; re-affirmed as still-next; or deleted as resolved/obsolete. This file is read and triaged at the start of every session (the product office's Process P-1 § 4 (3); dispositions: Process P-8 § 4). It is not a substitute for the backlog — it's where things live before they're ready to become backlog items.

---

## Current situation summary

Release 0.2.0 is out and tagged; nothing is in progress (`STATUS.md`). Nothing staged.

---

## What needs adapting

<!-- One entry per item, in this shape:

### 1. Short title — new

**Previous assumption:** what was believed before.
**Revised assessment:** what is believed now, and why.
**Impact on plan:** what this changes, if adopted.
**Action:** the next step and who takes it.
-->

(none yet)

---

## Items that do not change

- A Claude session's GitHub proxy cannot create tags or delete branches; Adam does both. `gh pr create` fails (GraphQL); use `gh api` REST: open `POST repos/sugose/snake-demo/pulls`, merge `PUT repos/sugose/snake-demo/pulls/<n>/merge` with `merge_method=squash`, `sha=<head>` and `commit_title`.
- CI fails a change to `src/` without a test change. A records or prose PR carries an empty commit with a `Test-exempt: <reason>` trailer. Workflows are not touched (Process P-11).
- The secret Slow button (SPEC 2.14 (4)) and the playtest options `?level` and `?slow` are never named in player-facing text.
- Version history for the other apps (vizi PBI-1.40, Wushroom PBI-2.24, acuteping-harbor AH-25) is in their own backlogs, modelled on this app's SPEC 2.19; it is not Snake work.
