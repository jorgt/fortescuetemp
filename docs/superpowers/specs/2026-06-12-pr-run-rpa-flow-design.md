# PR Run RPA Flow Design

## Scope

Add the first testable PR intake and RPA checkpoint flow to the existing CAP app. Keep the implementation small: one support library plus action handlers on `MainService`.

## Model Assumptions

- `PRRuns.prNumber` will be unique.
- New intake rows use the existing `PRRuns.status = 'new'`.
- `PRRunMessages` has a `message: String` field.
- Exit statuses are the existing non-continuing statuses, including `outOfScope`, `fidelityFail`, `extractionFail`, and `quoteFidelityFail`.

## API

Add actions to `MainService`:

```cds
type RunMessageInput {
  step    : String;
  outcome : String;
  message : String;
}

action processPurchaseRequisition(prNumber: String) returns Map;
action getRunContext(prNumber: String, subProcess: Integer) returns Map;
action submitRunMessages(runId: UUID, subProcess: Integer, messages: many RunMessageInput) returns Map;
```

`processPurchaseRequisition` is both the manual test entry point and the helper target for the future Event Mesh subscriber.

## Intake Flow

`processPurchaseRequisition` checks `PRRuns` by `prNumber`. If a row exists, it returns a skipped result and does not create another run. If no row exists, it mock-fetches the PR through a function that includes commented future S/4 code using `cds.connect.to('s4')` and a `Z_PURCHASE_REQ` read. It inserts a `PRRuns` row with the fetched PR JSON stringified into `payload`, `status: 'new'`, and then calls a stubbed RPA kickoff function with commented future integration code.

## RPA Flow

Each RPA subprocess starts by calling `getRunContext`. CAP returns fresh context: the run row, parsed payload, `GeneralConfig`, and the exclusion/config lists needed for checks. RPA runs every check in the subprocess and collects messages locally.

Near the end of the subprocess, RPA calls `submitRunMessages` once with the collected message batch. CAP inserts the messages, derives whether any failures occurred, updates `PRRuns.status` according to subprocess outcome rules, and returns the updated run plus `shouldContinue`.

RPA starts the next flow only when `shouldContinue` is true.

## Implementation Shape

- `srv/main.js` contains the action handlers.
- A small library under `srv/lib/` contains reusable flow helpers: intake, context loading, message submission, status derivation, mocked S/4 fetch, and stubbed RPA kickoff.
- No new CDS service is needed for this first pass.

## Tests

Use `cds.test` to cover:

- first intake creates one `PRRuns` row with status `new` and stringified payload
- duplicate intake skips and does not insert a second row
- context loading returns the run, parsed payload, and config lists
- message submission stores the batch and updates status/`shouldContinue`
