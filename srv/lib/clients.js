const { OrchestrationClient } = require('@sap-ai-sdk/orchestration');
const cds = require('@sap/cds');
const path = require('path');
const { readFile } = require('fs/promises');

const promptPath = path.join(__dirname, '../..', 'prompts', 'pr-extraction.txt');


let _bpa, _db, _s4, _aiCore, _orchestrationClient, _prompt;

const getPrompt = async () => _prompt ??= await readFile(promptPath, 'utf-8');

module.exports = {
    bpa: async () => _bpa ??= await cds.connect.to('sap_process_automation'),
    db: async () => _db ??= await cds.connect.to('db'),
    s4: async () => _s4 ??= await cds.connect.to('s4'),
    messaging: async () => _s4 ??= await cds.connect.to('messaging'),
    aiCore: async () => _aiCore ??= await cds.connect.to('default_aicore'),
    orchestrationClient: async () => _orchestrationClient ??= new OrchestrationClient(
        {
            promptTemplating: {
                model: {
                    name: 'anthropic--claude-4.6-sonnet',
                    params: { max_tokens: 4096, temporature: 0 }
                },
                prompt: {
                    template: [
                        {
                            role: 'user', content: [
                                { type: 'text', text: await getPrompt() },
                                { type: 'file', file: { file_data: '{{?filetype}}', filename: '{{?filename}}' } }
                            ]
                        }
                    ]
                }
            }
        },
        { resourceGroup: 'default' }
    )
}