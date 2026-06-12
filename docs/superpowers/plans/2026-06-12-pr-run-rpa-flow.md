# PR Run RPA Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a testable CAP intake and RPA checkpoint API for purchase requisition runs.

**Architecture:** `MainService` exposes three actions. A single helper library in `srv/lib/` owns intake, context loading, message submission, status derivation, mocked S/4 fetch, and stubbed RPA kickoff.

**Tech Stack:** SAP CAP Node.js, CDS actions, `cds.test`, Node built-in test runner.

---

## File Structure

- Modify `srv/main.cds`: add action/type definitions.
- Modify `srv/main.js`: register action handlers and delegate to the helper library.
- Create `srv/lib/pr-run-flow.js`: reusable flow logic.
- Modify `package.json`: add `@cap-js/cds-test` and `npm test` script.
- Create `test/main-service.test.js`: CAP action tests.

### Task 1: Add Failing CAP Tests

**Files:**
- Modify: `package.json`
- Create: `test/main-service.test.js`

- [ ] **Step 1: Add test script**

Add this script:

```json
"test": "CDS_PLUGIN_UI5_ACTIVE=false node --test test/*.test.js"
```

- [ ] **Step 2: Create action tests**

Create `test/main-service.test.js` with tests for intake creation, duplicate skip, context loading, and message submission.

Use `cds.test.in(__dirname + '/..')`, deploy to `sqlite::memory:`, serve `MainService` in process, and call `service.send(...)` for `processPurchaseRequisition`, `getRunContext`, and `submitRunMessages`.

- [ ] **Step 3: Run tests and confirm failure**

Run: `npm test`

Expected: fails because the actions are not defined yet.

### Task 2: Expose MainService Actions

**Files:**
- Modify: `srv/main.cds`

- [ ] **Step 1: Add input type and actions**

Add `RunMessageInput` plus:

```cds
action processPurchaseRequisition(prNumber: String) returns Map;
action getRunContext(prNumber: String, subProcess: Integer) returns Map;
action submitRunMessages(runId: UUID, subProcess: Integer, messages: many RunMessageInput) returns Map;
```

- [ ] **Step 2: Run tests and confirm handler failure**

Run: `npm test`

Expected: action routes exist, but fail because no handlers are implemented.

### Task 3: Implement Flow Library

**Files:**
- Create: `srv/lib/pr-run-flow.js`

- [ ] **Step 1: Implement helper functions**

Create functions:

```js
processPurchaseRequisition(db, prNumber)
getRunContext(db, prNumber, subProcess)
submitRunMessages(db, runId, subProcess, messages)
deriveStatus(subProcess, messages)
```

The library checks duplicates by `prNumber`, stores `payload` as `JSON.stringify(pr)`, returns fresh config in context, batches `PRRunMessages` inserts, and derives `shouldContinue` from exit statuses.

- [ ] **Step 2: Include integration stubs**

Add real async functions for mocked S/4 fetch and RPA kickoff. Keep commented future `cds.connect.to('s4')`, `Z_PURCHASE_REQ` read, and future RPA call inside those functions.

### Task 4: Wire Action Handlers

**Files:**
- Modify: `srv/main.js`

- [ ] **Step 1: Register handlers**

Import `srv/lib/pr-run-flow.js`, connect to `db`, and register:

```js
this.on("processPurchaseRequisition", req => flow.processPurchaseRequisition(db, req.data.prNumber));
this.on("getRunContext", req => flow.getRunContext(db, req.data.prNumber, req.data.subProcess));
this.on("submitRunMessages", req => flow.submitRunMessages(db, req.data.runId, req.data.subProcess, req.data.messages));
```

- [ ] **Step 2: Run tests and confirm pass**

Run: `npm test`

Expected: all action tests pass.

### Task 5: Verify and Commit

**Files:**
- All changed files

- [ ] **Step 1: Run full verification**

Run:

```bash
npm test
npx cds compile srv/main.cds
```

Expected: tests pass and CDS compile succeeds.

- [ ] **Step 2: Commit implementation**

Run:

```bash
git add package.json package-lock.json db/schema.cds srv/main.cds srv/main.js srv/lib/pr-run-flow.js test/main-service.test.js docs/superpowers/plans/2026-06-12-pr-run-rpa-flow.md
git commit -m "feat: add PR run RPA flow actions"
```
