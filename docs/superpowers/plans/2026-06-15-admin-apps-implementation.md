# Admin Apps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build two CAP-served UI apps: a Fiori elements PR run monitor with header-level status analytics and a custom SAPUI5 config maintenance app with directly editable tables.

**Architecture:** Keep both apps on `AdminService`. Add the missing admin projections, readonly status aggregation, and explicit PR run status actions in CAP, then add one Fiori elements app under `app/prruns` and one freestyle UI5 app under `app/config`. Use `cds-plugin-ui5` and the existing CAP workspace layout so both apps are served by `cds watch` from the project root.

**Tech Stack:** SAP CAP CDS/Node.js, OData V4, SAP Fiori elements V4, SAPUI5 freestyle XML view/controller, UI5 tooling, Node test runner.

---

## File Structure

- Modify `db/schema.cds`: add `PRRunStatusCounts` grouped view.
- Modify `srv/admin.cds`: expose non-draft config projections, `PRRunMessages`, `PRRunStatusCounts`, PR run actions, and Fiori annotations.
- Create `srv/admin.js`: implement `retry` and `setToFail`.
- Create `test/admin-service.test.js`: backend tests for projections, aggregation, readonly behavior, and actions.
- Create `app/prruns/**`: Fiori elements monitor app.
- Create `app/config/**`: custom UI5 editable config app.
- Modify `package.json`: include both apps in `sapux`.
- Modify `mta.yaml`: add the PRRuns html5 module and app deployer artifact.
- Modify `app/portal/portal-site/CommonDataModel.json`: add launchpad entries for both apps.

---

### Task 1: Backend Service Contract

**Files:**
- Modify: `db/schema.cds`
- Modify: `srv/admin.cds`
- Create: `srv/admin.js`
- Create: `test/admin-service.test.js`

- [ ] **Step 1: Write backend tests**

Create `test/admin-service.test.js` with tests that seed `com.fortescue.lowvalueprtopo.PRRuns`, read `AdminService.PRRunStatusCounts`, call bound actions on `AdminService.PRRuns`, verify `ExcludedItemCats` is exposed, and verify direct update of readonly `PRRuns` is rejected.

```js
const assert = require("node:assert/strict");
const cds = require("@sap/cds");

cds.test.in(__dirname + "/..");

const namespace = "com.fortescue.lowvalueprtopo";

describe("AdminService", () => {
  let service;

  before(async () => {
    const csn = await cds.load(["db", "srv/admin.cds"]);
    await cds.deploy(csn).to("sqlite::memory:");
    await cds.serve("AdminService").from(csn);
    service = await cds.connect.to("AdminService");
  });

  after(async () => {
    await cds.shutdown();
  });

  beforeEach(async () => {
    await DELETE.from(`${namespace}.PRRunMessages`);
    await DELETE.from(`${namespace}.PRRuns`);
    await DELETE.from(`${namespace}.ExcludedItemCats`);
  });

  async function insertRun(status, suffix = status) {
    const ID = cds.utils.uuid();
    await INSERT.into(`${namespace}.PRRuns`).entries({
      ID,
      prNumber: String(1000000000 + Math.floor(Math.random() * 999999)).slice(0, 10),
      changeMarker: `test-${suffix}`,
      status,
      payload: JSON.stringify({ prNumber: suffix, items: [] })
    });
    return ID;
  }

  it("exposes excluded item categories through AdminService", async () => {
    await INSERT.into(`${namespace}.ExcludedItemCats`).entries({
      ID: cds.utils.uuid(),
      name: "service",
      descr: "Service items",
      value: "D"
    });

    const rows = await service.run(SELECT.from("AdminService.ExcludedItemCats"));

    assert.equal(rows.length, 1);
    assert.equal(rows[0].name, "service");
    assert.equal(rows[0].value, "D");
  });

  it("returns PR run status counts", async () => {
    await insertRun("new", "new-1");
    await insertRun("new", "new-2");
    await insertRun("extractionFail", "error-1");

    const rows = await service.run(SELECT.from("AdminService.PRRunStatusCounts"));
    const counts = Object.fromEntries(rows.map((row) => [row.status, row.count]));

    assert.equal(counts.new, 2);
    assert.equal(counts.extractionFail, 1);
  });

  it("retries a run by resetting status to new and writing an audit message", async () => {
    const ID = await insertRun("extractionFail", "retry");

    const result = await service.send({
      event: "retry",
      entity: "PRRuns",
      params: [{ ID }]
    });

    const messages = await SELECT.from(`${namespace}.PRRunMessages`).where({ run_ID: ID });

    assert.equal(result.status, "new");
    assert.equal(messages.length, 1);
    assert.equal(messages[0].step, "retry");
    assert.equal(messages[0].outcome, "pass");
  });

  it("sets a run to fidelityFail and writes an audit message", async () => {
    const ID = await insertRun("inProgress", "fail");

    const result = await service.send({
      event: "setToFail",
      entity: "PRRuns",
      params: [{ ID }]
    });

    const messages = await SELECT.from(`${namespace}.PRRunMessages`).where({ run_ID: ID });

    assert.equal(result.status, "fidelityFail");
    assert.equal(messages.length, 1);
    assert.equal(messages[0].step, "setToFail");
    assert.equal(messages[0].outcome, "fail");
  });

  it("keeps PRRuns readonly for ordinary updates", async () => {
    const ID = await insertRun("new", "readonly");

    await assert.rejects(
      () => service.run(UPDATE("AdminService.PRRuns").set({ status: "posted" }).where({ ID })),
      /ENTITY_IS_READ_ONLY|read-only|readonly|not allowed/i
    );
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test`

Expected: `test/admin-service.test.js` fails because `AdminService.ExcludedItemCats`, `AdminService.PRRunStatusCounts`, and the two PR run actions do not exist yet.

- [ ] **Step 3: Add the status-count view**

Add this entity to `db/schema.cds` after `PRRunMessages`:

```cds
entity PRRunStatusCounts as select from PRRuns {
    key status,
    count(1) as count: Integer
} group by status;
```

- [ ] **Step 4: Extend AdminService and add annotations**

Update `srv/admin.cds` so `AdminService` exposes all admin entities and annotations. Keep `PRRuns` readonly and make mutations available only through bound actions.

```cds
using { com.fortescue.lowvalueprtopo as po } from '../db/schema';

service AdminService  {
    entity GeneralConfig as projection on po.GeneralConfig;

    entity ExcludedVendors as projection on po.ExcludedVendors;

    entity ExcludedPlants as projection on po.ExcludedPlants;

    entity ExcludedItemCats as projection on po.ExcludedItemCats;

    entity ExcludedPhrases as projection on po.ExcludedPhrases;

    @readonly
    entity PRRuns as projection on po.PRRuns actions {
        action retry() returns PRRuns;
        action setToFail() returns PRRuns;
    };

    @readonly
    entity PRRunMessages as projection on po.PRRunMessages;

    @readonly
    entity PRRunStatusCounts as projection on po.PRRunStatusCounts;
}

annotate AdminService.PRRuns with @(
    UI.HeaderInfo: {
        TypeName: 'PR Run',
        TypeNamePlural: 'PR Runs',
        Title: { Value: prNumber },
        Description: { Value: status }
    },
    UI.SelectionFields: [ prNumber, status, poNumber, changeMarker, createdAt, modifiedAt ],
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: prNumber, Label: 'PR Number' },
        { $Type: 'UI.DataField', Value: status, Label: 'Status' },
        { $Type: 'UI.DataField', Value: poNumber, Label: 'PO Number' },
        { $Type: 'UI.DataField', Value: changeMarker, Label: 'Change Marker' },
        { $Type: 'UI.DataField', Value: createdAt, Label: 'Created At' },
        { $Type: 'UI.DataField', Value: modifiedAt, Label: 'Modified At' },
        { $Type: 'UI.DataFieldForAction', Action: 'AdminService.retry', Label: 'Retry' },
        { $Type: 'UI.DataFieldForAction', Action: 'AdminService.setToFail', Label: 'Set to Fail' }
    ],
    UI.FieldGroup #General: {
        Data: [
            { $Type: 'UI.DataField', Value: prNumber, Label: 'PR Number' },
            { $Type: 'UI.DataField', Value: status, Label: 'Status' },
            { $Type: 'UI.DataField', Value: poNumber, Label: 'PO Number' },
            { $Type: 'UI.DataField', Value: changeMarker, Label: 'Change Marker' }
        ]
    },
    UI.Facets: [
        { $Type: 'UI.ReferenceFacet', ID: 'General', Label: 'General', Target: '@UI.FieldGroup#General' },
        { $Type: 'UI.ReferenceFacet', ID: 'Messages', Label: 'Messages', Target: 'messages/@UI.LineItem' }
    ]
);

annotate AdminService.PRRunMessages with @(
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: subProcess, Label: 'Sub Process' },
        { $Type: 'UI.DataField', Value: step, Label: 'Step' },
        { $Type: 'UI.DataField', Value: outcome, Label: 'Outcome' },
        { $Type: 'UI.DataField', Value: message, Label: 'Message' },
        { $Type: 'UI.DataField', Value: createdAt, Label: 'Created At' }
    ]
);

annotate AdminService.PRRunStatusCounts with @(
    Aggregation.ApplySupported: {
        GroupableProperties: [ status ],
        AggregatableProperties: [ { Property: count } ]
    },
    UI.Chart #StatusDistribution: {
        $Type: 'UI.ChartDefinitionType',
        Title: 'Runs by Status',
        ChartType: #Column,
        Dimensions: [ status ],
        Measures: [ count ]
    },
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: status, Label: 'Status' },
        { $Type: 'UI.DataField', Value: count, Label: 'Runs' }
    ]
);
```

- [ ] **Step 5: Implement AdminService actions**

Create `srv/admin.js`:

```js
const cds = require("@sap/cds");

const namespace = "com.fortescue.lowvalueprtopo";

const entities = {
  PRRuns: `${namespace}.PRRuns`,
  PRRunMessages: `${namespace}.PRRunMessages`,
};

class AdminService extends cds.ApplicationService {
  async init() {
    this.on("retry", "PRRuns", (req) =>
      updateRunStatus(req, "new", "retry", "pass", "Run queued for retry")
    );

    this.on("setToFail", "PRRuns", (req) =>
      updateRunStatus(req, "fidelityFail", "setToFail", "fail", "Run manually set to failed")
    );

    await super.init();
  }
}

async function updateRunStatus(req, status, step, outcome, message) {
  const ID = getBoundRunId(req);
  if (!ID) {
    return req.reject(400, "PR run ID is required");
  }

  const tx = cds.tx(req);
  const run = await tx.run(SELECT.one.from(entities.PRRuns).where({ ID }));

  if (!run) {
    return req.reject(404, `PR run ${ID} was not found`);
  }

  await tx.run(UPDATE(entities.PRRuns).set({ status }).where({ ID }));
  await tx.run(
    INSERT.into(entities.PRRunMessages).entries({
      ID: cds.utils.uuid(),
      run_ID: ID,
      subProcess: 0,
      step,
      outcome,
      message,
    })
  );

  return tx.run(SELECT.one.from(entities.PRRuns).where({ ID }));
}

function getBoundRunId(req) {
  const [params] = req.params || [];
  return params && params.ID;
}

module.exports = AdminService;
```

- [ ] **Step 6: Run backend tests**

Run: `npm test`

Expected: all backend tests pass. If the bound action invocation shape differs, keep the handler contract unchanged and adjust only the test call shape to the CAP-supported bound action API.

---

### Task 2: PRRuns Fiori Elements App

**Files:**
- Create: `app/prruns/package.json`
- Create: `app/prruns/ui5.yaml`
- Create: `app/prruns/xs-app.json`
- Create: `app/prruns/webapp/index.html`
- Create: `app/prruns/webapp/Component.js`
- Create: `app/prruns/webapp/manifest.json`
- Create: `app/prruns/webapp/i18n/i18n.properties`

- [ ] **Step 1: Create the Fiori elements files**

Create the app with id `com.fortescue.lowvalueprtopo.prruns`, name `comfortescuelowvalueprtopoprruns`, and service URI `/odata/v4/admin/`.

`app/prruns/webapp/manifest.json` must use a `sap.fe.templates.ListReport` target with context path `/PRRuns`, navigation to a `sap.fe.templates.ObjectPage`, and `views.paths` defaulting to `both` with chart annotation `com.sap.vocabularies.UI.v1.Chart#StatusDistribution` and table annotation `com.sap.vocabularies.UI.v1.LineItem`.

- [ ] **Step 2: Validate the manifest**

Run UI5 manifest validation on `app/prruns/webapp/manifest.json`.

Expected: no manifest errors.

---

### Task 3: Custom Config App

**Files:**
- Create: `app/config/package.json`
- Create: `app/config/ui5.yaml`
- Create: `app/config/xs-app.json`
- Create: `app/config/webapp/index.html`
- Create: `app/config/webapp/Component.js`
- Create: `app/config/webapp/manifest.json`
- Create: `app/config/webapp/i18n/i18n.properties`
- Create: `app/config/webapp/view/App.view.xml`
- Create: `app/config/webapp/controller/App.controller.js`

- [ ] **Step 1: Create the app shell**

Create a freestyle UI5 app with id `com.fortescue.lowvalueprtopo.config`, name `comfortescuelowvalueprtopoconfig`, and service URI `/odata/v4/admin/`.

- [ ] **Step 2: Check API reference for OData V4 edit calls**

After `app/config` exists, run UI5 API reference lookups for:

- `sap.ui.model.odata.v4.Context#delete`
- `sap.ui.model.odata.v4.ODataModel#submitBatch`
- `sap.ui.model.odata.v4.ODataModel#resetChanges`
- `sap.ui.model.odata.v4.ODataListBinding#create`

Use the returned signatures in the controller.

- [ ] **Step 3: Create editable tab tables**

Build `App.view.xml` with an `IconTabBar` and five tables bound to:

- `/GeneralConfig`
- `/ExcludedVendors`
- `/ExcludedPlants`
- `/ExcludedItemCats`
- `/ExcludedPhrases`

Each table uses inline `sap.m.Input` controls for `name`, `descr`, and `value`, plus a `MultiSelect` mode for deletion.

- [ ] **Step 4: Implement controller actions**

Implement:

- `onAddRow`: create a row on the currently selected table binding.
- `onDeleteRows`: delete selected contexts.
- `onSave`: submit the app update group.
- `onRefresh`: reset pending changes and refresh.

- [ ] **Step 5: Run UI5 validation**

Run manifest validation and the UI5 linter for `app/config`.

Expected: no manifest errors and no high-risk linter findings.

---

### Task 4: CAP Build, Portal, and Deployment Wiring

**Files:**
- Modify: `package.json`
- Modify: `mta.yaml`
- Modify: `app/portal/portal-site/CommonDataModel.json`

- [ ] **Step 1: Add app paths to package metadata**

Set:

```json
"sapux": [
  "app/config",
  "app/prruns"
]
```

- [ ] **Step 2: Add PRRuns html5 module to mta.yaml**

Add `comfortescuelowvalueprtopoprruns` as an HTML5 module and include `comfortescuelowvalueprtopoprruns.zip` in `LowValuePRtoPO-app-deployer` artifacts.

- [ ] **Step 3: Add portal launch entries**

Add portal viz entries for both apps:

- Config: semantic object `Config`, action `maintain`, app id `com.fortescue.lowvalueprtopo.config`.
- PR Runs: semantic object `PRRuns`, action `display`, app id `com.fortescue.lowvalueprtopo.prruns`.

---

### Task 5: Verification, Commit, and Push

**Files:**
- All changed files.

- [ ] **Step 1: Compile CAP model**

Run: `npx cds compile '*' --to serviceinfo`

Expected: `AdminService` remains at `odata/v4/admin/`.

- [ ] **Step 2: Run tests**

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 3: Run UI5 validations**

Run manifest validation for both manifests and UI5 linter for both app roots.

Expected: no blocking findings.

- [ ] **Step 4: Inspect git diff**

Run: `git status --short` and `git diff --stat`.

Expected: only planned backend, app, docs, portal, and deployment files changed.

- [ ] **Step 5: Commit**

Run:

```bash
git add db/schema.cds srv/admin.cds srv/admin.js test/admin-service.test.js app/prruns app/config package.json mta.yaml app/portal/portal-site/CommonDataModel.json docs/superpowers/plans/2026-06-15-admin-apps-implementation.md
git commit -m "feat: add admin UI apps"
```

- [ ] **Step 6: Push**

Check GitHub CLI authentication/status, then push the branch:

```bash
gh status
git push
```

Expected: local commits are pushed to the tracked remote branch.
