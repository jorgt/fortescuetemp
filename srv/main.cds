using { com.fortescue.lowvalueprtopo as po } from '../db/schema';

service MainService {
    type RunMessageInput {
        step: String;
        outcome: String;
        message: String;
    }

    entity PRRuns as projection on po.PRRuns;
    entity PRRunMessages as projection on po.PRRunMessages;
    entity GeneralConfig as projection on po.GeneralConfig;
    entity excludedVendors as projection on po.ExcludedVendors;
    entity excludedPlants as projection on po.ExcludedPlants;
    entity excludedItemCats as projection on po.ExcludedItemCats;
    entity excludedPhrases as projection on po.ExcludedPhrases;

    action processPurchaseRequisition(prNumber: String) returns Map;
    action getRunContext(prNumber: String, subProcess: Integer) returns Map;
    action submitRunMessages(runId: UUID, subProcess: Integer, messages: many RunMessageInput) returns Map;
}
