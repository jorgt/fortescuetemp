using { com.fortescue.lowvalueprtopo as po } from '../db/schema';

service MainService {
    entity PRRuns as projection on po.PRRuns;
    entity PRRunMessages as projection on po.PRRunMessages;
    entity GeneralConfig as projection on po.GeneralConfig;
    entity excludedVendors as projection on po.ExcludedVendors;
    entity excludedPlants as projection on po.ExcludedPlants;
    entity excludedItemCats as projection on po.ExcludedItemCats;
    entity excludedPhrases as projection on po.ExcludedPhrases;

    // action 
}