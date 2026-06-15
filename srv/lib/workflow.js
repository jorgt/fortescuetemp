// get the workflow instance 
const cds = require("@sap/cds");
const { bpa } = require('./lib/clients');

module.exports = {
    async startWorkflow(definitionId, context) {
        const c = await bpa()
        return c.send({
            method: 'POST',
            path: '/workflow/rest/v1/workflow-instances',
            data: { definitionId, context }
        })
    },

    async getReadyTaskId(instanceId) {
        const c = await bpa()
        const tasks = await c.get(`/workflow/rest/v1/task-instances?workflowInstanceId=${instanceId}&status=READY`)
        return tasks[0]?.id
    },
    async completeTask(taskId, context) {
        const c = await bpa()
        return c.send({
            method: 'PATCH',
            path: `/workflow/rest/v1/task-instances/${taskId}`,
            data: { status: 'COMPLETED', context }
        })
    },
    async getInstance(instanceId) {
        const c = await bpa()
        return c.get(`/workflow/rest/v1/workflow-instances/${instanceId}`)
    }
}