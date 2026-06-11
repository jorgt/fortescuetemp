const cds = require('@sap/cds');

cds.on('bootstrap', (app) => {
  // Add custom middleware or routes here
});

cds.on('served', async (app) => {
  // const messaging = await cds.connect.to('messaging');

  // // Example: Subscribe to a Cloud Event topic
  // await messaging.on('sap.s4.beh.businesspartner.v1.BusinessPartner.Changed.v1', (message) => {
  //   console.log('Received message:', message);
  //   // Process the message as needed
  // });
});