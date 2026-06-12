const cds = require("@sap/cds");
const flow = require("./lib/pr-run-flow");

class MainService extends cds.ApplicationService {
  async init() {
    const db = await cds.connect.to("db");

    this.on("processPurchaseRequisition", (req) =>
      flow.processPurchaseRequisition(db, req.data.prNumber)
    );

    this.on("getRunContext", (req) =>
      flow.getRunContext(db, req.data.prNumber, req.data.subProcess)
    );

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
