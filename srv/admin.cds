using { com.fortescue.lowvalueprtopo as po } from '../db/schema';

//@(requires: ['Admin'])
service AdminService  {
    @odata.draft.enabled: true
    entity GeneralConfig as projection on po.GeneralConfig;
    
    @odata.draft.enabled: true
    entity ExcludedVendors as projection on po.ExcludedVendors;
    
    @odata.draft.enabled: true
    entity ExcludedPlants as projection on po.ExcludedPlants;
    
    @odata.draft.enabled: true
    entity ExcludedPhrases as projection on po.ExcludedPhrases;
    
    @readonly entity PRRuns as projection on po.PRRuns;
}