# Admin UI Apps Design

## Context

This CAP project starts with `AdminService` at `/odata/v4/admin/`. It includes draft-enabled config projections for `GeneralConfig`, `ExcludedVendors`, `ExcludedPlants`, and `ExcludedPhrases`, plus a readonly `PRRuns` projection. `MainService` also exposes `ExcludedItemCats`, but `AdminService` does not yet.

The requirement is two apps:

- A Fiori elements analytical/list-report app for monitoring PR run headers.
- A simple custom SAPUI5 config app with directly editable tables.

PR run KPI counts are header-level counts. The apps do not inspect or persist item-line status from `payload.items`.

## Recommended Approach

Use `AdminService` for both apps.

This keeps administration concerns in one service, lets the PR run monitor use Fiori elements metadata and annotations, and avoids forcing config maintenance through Fiori elements draft/object-page editing. The config tables are small, so the custom app can use straightforward OData reads and writes without adding heavy client state or local caching.

## Backend Shape

Extend `AdminService` with:

- `ExcludedItemCats` as a config projection.
- Existing config projections should be non-draft in `AdminService` so the custom app can perform direct table editing without draft activation flows.
- `PRRunMessages` as a readonly projection for object page/message display.
- `PRRunStatusCounts` as a readonly grouped view over `PRRuns` with key `status` and measure `count`.
- Bound actions on `PRRuns`:
  - `retry`: resets selected failed or stuck run headers to `new` and records an audit message. The current backend has no real external RPA retry integration, so this action prepares the run for retry and provides the integration point for a later kickoff call.
  - `setToFail`: sets selected run headers to `fidelityFail` and records an audit message. No generic `failed` enum is added.

`PRRuns` remains readonly for normal CRUD. Only the explicit actions can change its status.

## PR Runs App

Create `app/prruns` as a Fiori elements app using `/odata/v4/admin/` and `PRRuns`.

The list report should support:

- Search by PR number and related visible fields.
- Filters for `status`, `createdAt`, `modifiedAt`, `poNumber`, and `changeMarker`.
- Table columns for PR number, status, PO number, change marker, created/modified timestamps.
- Header-level KPI/status presentation:
  - Initial: count of `PRRuns` where `status = 'new'`.
  - Error: count of `PRRuns` where `status in ('fidelityFail', 'extractionFail', 'quoteFidelityFail')`.
  - In progress: count where `status = 'inProgress'`.
  - Posted: count where `status = 'posted'`.
- A compact bar chart showing the count of run headers by status.
- Object page details for a selected run.
- A messages section showing composed `PRRunMessages`.
- Table/header actions for `retry` and `setToFail`.

Basic OData count and aggregation queries are acceptable. Expected data volume is low enough that simple counts over `PRRuns` are appropriate. The status bar chart binds to the readonly `PRRunStatusCounts` aggregate rather than doing client-side counting.

## Config App

Create `app/config` as a custom SAPUI5 app using `/odata/v4/admin/`.

The first screen is the maintenance interface, not a landing page. Use an `IconTabBar` with one tab per config entity:

- General Config
- Excluded Vendors
- Excluded Plants
- Excluded Item Categories
- Excluded Phrases

Each tab contains one editable table with columns:

- `name`
- `descr`
- `value`

Controls:

- Add row
- Delete selected row
- Save pending changes
- Refresh/revert pending changes

The app should keep the interaction simple: inline inputs in the table, compact toolbar actions, and clear success/error message handling. It should not use Fiori elements draft object-page navigation for these tables.

## Data Flow

PR runs app:

1. Fiori elements reads `PRRuns` from `AdminService`.
2. Filter/search requests are handled by CAP OData.
3. KPI cards or visual filters issue count/aggregation reads against `PRRuns`.
4. The status bar chart reads grouped counts from `PRRunStatusCounts`.
5. Object page navigation reads the selected run and its `messages`.
6. Actions call bound `AdminService` actions and refresh the table/object page.

Config app:

1. The custom controller binds each tab table to one config entity set.
2. Inline edits update the OData V4 model.
3. Save submits the model batch.
4. Refresh resets pending local changes and reloads server state.
5. Create/delete use the OData list binding/context APIs.

## Error Handling

Backend actions validate that selected `PRRuns` exist before changing status. Invalid or missing IDs return CAP errors.

The PR runs app relies on Fiori elements message handling for action failures.

The config app shows backend errors through `sap.m.MessageBox` or the UI5 message model and keeps unsaved changes visible until the user saves, refreshes, or resolves the error.

## Testing

Backend tests should cover:

- `AdminService` exposes all config entities, including `ExcludedItemCats`.
- `retry` updates a run header to `new`.
- `setToFail` updates a run header to `fidelityFail`.
- Status-count aggregation returns one row per status with the expected count.
- PR run actions do not allow ordinary CRUD updates on readonly `PRRuns`.

Frontend verification should cover:

- Both apps are served by `cds watch` through `cds-plugin-ui5`.
- The PRRuns app loads from `/odata/v4/admin/`, shows filters/table data, and exposes the two actions.
- The PRRuns app shows a status bar chart with counts for the available statuses.
- The config app can read, edit, add, delete, save, and refresh rows for each config entity.
- UI5 manifest validation and UI5 linter pass for both apps.

## Non-Goals

- No separate persisted PR line entity.
- No item-line status KPI.
- No generic `failed` status enum.
- No Fiori elements app for config maintenance.
- No custom PR monitoring shell unless Fiori elements proves insufficient.
