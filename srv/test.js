const cds = require("@sap/cds");
const { readFile } = require('fs/promises');
const { extractPRAttachmentWithAi } = require("./lib/ai-extraction");

class TestService extends cds.ApplicationService {
    async init() {
        const prompt = await readFile('prompts/pr-extraction.txt', 'utf-8');
        this.on("testFunction", async (req) => {
            const file = await readFile('test/250817FMG-SOL-PowerStationBuildings_20250828074258.643_X.pdf', 'base64');


            return await extractPRAttachmentWithAi(file);
        });
        await super.init();
    }
}
module.exports = TestService;