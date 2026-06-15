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
      updateRunStatus(
        req,
        "fidelityFail",
        "setToFail",
        "fail",
        "Run manually set to failed"
      )
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
