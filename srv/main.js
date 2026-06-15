const cds = require("@sap/cds");
const flow = require("./lib/pr-run-flow");
class MainService extends cds.ApplicationService {
  async init() {
    const db = await cds.connect.to("db");

    // this kicks off the PR run flow for a given PR number, it will create a new run if it doesn't exist or skip if it does
    this.on("processPurchaseRequisition", (req) =>
      flow.processPurchaseRequisition(db, req.data.prNumber)
    );

    // this fetches the PR run context for a given PR number and subprocess (like intake, rpa, etc)
    this.on("getRunContext", (req) =>
      flow.getRunContext(db, req.data.prNumber, req.data.subProcess)
    );

    // this submits messages for a given run and subprocess, which will be used to determine the outcome of each step and ultimately the exit status of the run
    this.on("submitRunMessages", (req) =>
      flow.submitRunMessages(
        db,
        req.data.runId,
        req.data.subProcess,
        req.data.messages
      )
    );

    await super.init();
  }
}
module.exports = MainService;
