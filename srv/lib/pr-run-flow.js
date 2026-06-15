const cds = require("@sap/cds");

const namespace = "com.fortescue.lowvalueprtopo";

const entities = {
  PRRuns: `${namespace}.PRRuns`,
  PRRunMessages: `${namespace}.PRRunMessages`,
  GeneralConfig: `${namespace}.GeneralConfig`,
  ExcludedVendors: `${namespace}.ExcludedVendors`,
  ExcludedPlants: `${namespace}.ExcludedPlants`,
  ExcludedItemCats: `${namespace}.ExcludedItemCats`,
  ExcludedPhrases: `${namespace}.ExcludedPhrases`,
};

const exitStatuses = new Set([
  "outOfScope",
  "fidelityFail",
  "extractionFail",
  "quoteFidelityFail",
]);

async function processPurchaseRequisition(db, prNumber) {
  assertPrNumber(prNumber);

  const existing = await db.run(
    SELECT.one.from(entities.PRRuns).where({ prNumber })
  );

  if (existing) {
    return {
      skipped: true,
      run: existing,
      pr: parsePayload(existing.payload),
    };
  }

  const pr = await fetchPurchaseRequisition(prNumber);
  const run = {
    ID: cds.utils.uuid(),
    prNumber,
    changeMarker: pr.changeMarker,
    status: "new",
    payload: JSON.stringify(pr),
  };

  await db.run(INSERT.into(entities.PRRuns).entries(run));
  await kickOffRpa(run);

  return {
    skipped: false,
    run,
    pr,
  };
}

async function getRunContext(db, prNumber, subProcess) {
  assertPrNumber(prNumber);

  const run = await db.run(
    SELECT.one.from(entities.PRRuns).where({ prNumber })
  );

  if (!run) {
    throw cds.error(`PR run ${prNumber} was not found`, { code: 404 });
  }

  return {
    run,
    payload: parsePayload(run.payload),
    subProcess,
    config: await loadConfig(db),
  };
}

async function submitRunMessages(db, runId, subProcess, messages = []) {
  if (!runId) {
    throw cds.error("runId is required", { code: 400 });
  }

  const run = await db.run(
    SELECT.one.from(entities.PRRuns).where({ ID: runId })
  );

  if (!run) {
    throw cds.error(`PR run ${runId} was not found`, { code: 404 });
  }

  const entries = messages.map((message) => ({
    ID: cds.utils.uuid(),
    run_ID: run.ID,
    subProcess,
    step: message.step,
    outcome: message.outcome,
    message: message.message,
  }));

  if (entries.length > 0) {
    await db.run(INSERT.into(entities.PRRunMessages).entries(entries));
  }

  const status = deriveStatus(subProcess, messages);
  await db.run(
    UPDATE(entities.PRRuns).set({ status }).where({ ID: run.ID })
  );

  const updatedRun = await db.run(
    SELECT.one.from(entities.PRRuns).where({ ID: run.ID })
  );

  return {
    run: updatedRun,
    shouldContinue: !exitStatuses.has(updatedRun.status),
    messagesStored: entries.length,
  };
}

function deriveStatus(subProcess, messages = []) {
  const hasFailure = messages.some((message) => message.outcome === "fail");

  if (!hasFailure) {
    return "inProgress";
  }

  switch (subProcess) {
    case 1:
      return "outOfScope";
    case 2:
      return "fidelityFail";
    case 3:
      return "extractionFail";
    case 4:
      return "quoteFidelityFail";
    default:
      return "fidelityFail";
  }
}

async function loadConfig(db) {
  const [
    general,
    excludedVendors,
    excludedPlants,
    excludedItemCats,
    excludedPhrases,
  ] = await Promise.all([
    db.run(SELECT.from(entities.GeneralConfig)),
    db.run(SELECT.from(entities.ExcludedVendors)),
    db.run(SELECT.from(entities.ExcludedPlants)),
    db.run(SELECT.from(entities.ExcludedItemCats)),
    db.run(SELECT.from(entities.ExcludedPhrases)),
  ]);

  return {
    general,
    excludedVendors,
    excludedPlants,
    excludedItemCats,
    excludedPhrases,
  };
}

/**
 * 
 * @param {String} prNumber 
 * @returns 
 * 
 * In a real implementation, this would fetch the PR details from S/4 using the appropriate API, but for this demo we'll just return a mock object
 * 
 * Reads the PR from S4. 
 */
async function fetchPurchaseRequisition(prNumber) {
  // const s4 = await cds.connect.to("s4");
  // return s4.read("Z_PURCHASE_REQ").where({ PurchaseRequisition: prNumber });
  return {
    prNumber,
    changeMarker: `mock-${prNumber}`,
    header: {
      description: `Mock purchase requisition ${prNumber}`,
      currency: "AUD",
      totalValue: 1000,
    },
    items: [
      {
        line: 1,
        material: "MOCK-MATERIAL",
        description: "Mock low value PR line",
        quantity: 1,
        unit: "EA",
        netValue: 1000,
        plant: "1000",
        itemCategory: "0",
        vendor: "MOCK_VENDOR",
      },
    ],
  };
}

/**
 * 
 * @param {*} run 
 * @returns 
 * 
 * Starts the RPA process for a particular PR run / PR number
 */
async function kickOffRpa(run) {
  // const rpa = await cds.connect.to("rpa");
  // await rpa.send("StartPurchaseRequisitionChecks", { run });
  return {
    started: true,
    runId: run.ID,
  };
}

function parsePayload(payload) {
  if (!payload) {
    return null;
  }

  return JSON.parse(payload);
}

function assertPrNumber(prNumber) {
  if (!prNumber) {
    throw cds.error("prNumber is required", { code: 400 });
  }
}

module.exports = {
  processPurchaseRequisition,
  getRunContext,
  submitRunMessages,
  deriveStatus,
};
