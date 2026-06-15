const assert = require("node:assert/strict");
const cds = require("@sap/cds");

cds.test.in(__dirname + "/..");

const namespace = "com.fortescue.lowvalueprtopo";

describe("AdminService", () => {
  let service;
  let prNumberCounter = 1000000000;

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
    prNumberCounter += 1;

    await INSERT.into(`${namespace}.PRRuns`).entries({
      ID,
      prNumber: String(prNumberCounter),
      changeMarker: `test-${suffix}`,
      status,
      payload: JSON.stringify({ prNumber: String(prNumberCounter), items: [] }),
    });

    return ID;
  }

  it("exposes excluded item categories through AdminService", async () => {
    await INSERT.into(`${namespace}.ExcludedItemCats`).entries({
      ID: cds.utils.uuid(),
      name: "service",
      descr: "Service items",
      value: "D",
    });

    const rows = await service.run(SELECT.from("AdminService.ExcludedItemCats"));

    assert.equal(rows.length, 1);
    assert.equal(rows[0].name, "service");
    assert.equal(rows[0].value, "D");
  });

  it("exposes config entities without draft keys for direct table editing", () => {
    for (const entityName of [
      "GeneralConfig",
      "ExcludedVendors",
      "ExcludedPlants",
      "ExcludedItemCats",
      "ExcludedPhrases",
    ]) {
      assert.equal(
        service.entities[entityName].elements.IsActiveEntity,
        undefined,
        `${entityName} should not require draft editing`
      );
    }
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
      params: [{ ID }],
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
      params: [{ ID }],
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
