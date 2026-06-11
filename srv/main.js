const cds = require("@sap/cds");

class MainService extends cds.ApplicationService {
  async init() {
    // const alert = await cds.connect.to("AI_CORE");

    // this.on("sendNotification", async (req) => {
    //   alert.notify({
    //     recipients: [recipient],
    //     priority: "HIGH",
    //     title: "New high priority incident is assigned to you!",
    //     description:
    //       "Incident titled 'Engine overheating' created by 'customer X' with priority high is assigned to you!",
    //   });
    // });
    // this.on("sendIncidentResolved", async (req) => {
    //   await alert.notify("IncidentResolved", {
    //     recipients: [recipient],
    //     data: {
    //       customer: "CSW",
    //       title: "Engine overheating",
    //       user: "Gregor Wolf",
    //     },
    //   });
    // });

    // ensure to call super.init()
    await super.init();
  }
}
module.exports = MainService;