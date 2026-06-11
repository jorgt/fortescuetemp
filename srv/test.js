const cds = require("@sap/cds");
const { readFile } = require('fs/promises');
const { OrchestrationClient } = require('@sap-ai-sdk/orchestration');
const client = new OrchestrationClient(
    {
        promptTemplating: {
            model: {
                name: 'anthropic--claude-4.6-sonnet',
                params: { max_tokens: 4096 }
            }
        }
    },
    { resourceGroup: 'default' }   // + deploymentId: '...' if you want to pin
)

// const pdf = await readFile('invoice.pdf', 'base64')

// console.log(response.getContent())
class TestService extends cds.ApplicationService {
    async init() {
        const prompt = await readFile('prompts/pr-extraction.txt', 'utf-8');
        this.on("testFunction", async (req) => {
            const file = await readFile('test/250817FMG-SOL-PowerStationBuildings_20250828074258.643_X.pdf', 'base64');
            const response = await client.chatCompletion({
              messages: [
                {
                  role: 'user',   // file blocks only allowed on user role
                  content: [
                    { type: 'text', text: prompt },
                    {
                      type: 'file',
                      file: {
                        file_data: `data:application/pdf;base64,${file}`,
                        filename: 'invoice.pdf'
                      }
                    }
                  ]
                }
              ]
            });

            console.log(response.getFinishReason());
            console.log(JSON.stringify(response.getTokenUsage()));
            return JSON.parse(response.getContent());
        });
        await super.init();
    }
}
module.exports = TestService;