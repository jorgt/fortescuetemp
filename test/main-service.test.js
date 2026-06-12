const assert = require("node:assert/strict");
const cds = require("@sap/cds");

cds.test.in(__dirname + "/..");

const namespace = "com.fortescue.lowvalueprtopo";

describe("MainService PR run flow", () => {
  let db;
  let service;

  before(async () => {
    const csn = await cds.load(["db", "srv/main.cds"]);
    await cds.deploy(csn).to("sqlite::memory:");
    await cds.serve("MainService").from(csn);
    db = await cds.connect.to("db");
    service = await cds.connect.to("MainService");
  });

  after(async () => {
    await cds.shutdown();
  });

  beforeEach(async () => {
    await DELETE.from(`${namespace}.PRRunMessages`);
    await DELETE.from(`${namespace}.PRRuns`);
    await DELETE.from(`${namespace}.GeneralConfig`);
    await DELETE.from(`${namespace}.ExcludedVendors`);
    await DELETE.from(`${namespace}.ExcludedPlants`);
    await DELETE.from(`${namespace}.ExcludedItemCats`);
    await DELETE.from(`${namespace}.ExcludedPhrases`);
  });

  it("creates a new PR run with a stringified payload", async () => {
    const data = await service.send("processPurchaseRequisition", {
      prNumber: "1000000001",
    });

    assert.equal(data.skipped, false);
    assert.equal(data.run.prNumber, "1000000001");
    assert.equal(data.run.status, "new");
    assert.equal(typeof data.run.payload, "string");

    const runs = await SELECT.from(`${namespace}.PRRuns`).where({
      prNumber: "1000000001",
    });

    assert.equal(runs.length, 1);
    assert.deepEqual(JSON.parse(runs[0].payload), data.pr);
  });

  it("skips intake when the PR run already exists", async () => {
    await service.send("processPurchaseRequisition", {
      prNumber: "1000000002",
    });

    const data = await service.send("processPurchaseRequisition", {
      prNumber: "1000000002",
    });

    const runs = await SELECT.from(`${namespace}.PRRuns`).where({
      prNumber: "1000000002",
    });

    assert.equal(data.skipped, true);
    assert.equal(runs.length, 1);
  });

  it("returns fresh run context with parsed payload and config", async () => {
    await INSERT.into(`${namespace}.GeneralConfig`).entries({
      name: "max_total_value",
      value: "5000",
    });
    await INSERT.into(`${namespace}.ExcludedPhrases`).entries({
      name: "iron ore",
      value: "iron ore",
    });

    await service.send("processPurchaseRequisition", {
      prNumber: "1000000003",
    });

    const data = await service.send("getRunContext", {
      prNumber: "1000000003",
      subProcess: 1,
    });

    assert.equal(data.run.prNumber, "1000000003");
    assert.equal(data.payload.prNumber, "1000000003");
    assert.equal(data.subProcess, 1);
    assert.equal(data.config.general.length, 1);
    assert.equal(data.config.excludedPhrases.length, 1);
  });

  it("stores submitted messages and returns an exit status", async () => {
    const intake = await service.send("processPurchaseRequisition", {
      prNumber: "1000000004",
    });

    const data = await service.send("submitRunMessages", {
      runId: intake.run.ID,
      subProcess: 1,
      messages: [
        {
          step: "contains_phrases",
          outcome: "fail",
          message: 'line 4 contains the excluded phrase "iron ore"',
        },
      ],
    });

    const messages = await SELECT.from(`${namespace}.PRRunMessages`).where({
      run_ID: intake.run.ID,
    });

    assert.equal(data.shouldContinue, false);
    assert.equal(data.run.status, "outOfScope");
    assert.equal(messages.length, 1);
    assert.equal(messages[0].step, "contains_phrases");
    assert.equal(messages[0].message, 'line 4 contains the excluded phrase "iron ore"');
  });
});
