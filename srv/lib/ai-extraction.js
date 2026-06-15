const cds = require("@sap/cds");
const { orchestrationClient } = require('../lib/clients');
const LOG = cds.log("ai-extraction");

let prompt;

async function extractPRAttachmentWithAi(file) {
    LOG.info("Starting AI extraction for file");
    const client = await orchestrationClient();
    const response = await client.chatCompletion({
        placeholderValues: {
            filetype: `data:application/pdf;base64,${file}`,
            filename: 'invoice.pdf'
        }
    });
    console.log(JSON.stringify(response.getTokenUsage()));

    const content = JSON.parse(response.getContent());
    return {...content, tokenUsage: response.getTokenUsage() };
}

module.exports = {
    extractPRAttachmentWithAi
}