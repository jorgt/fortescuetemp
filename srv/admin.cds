using { com.fortescue.lowvalueprtopo as po } from '../db/schema';

//@(requires: ['Admin'])
service AdminService  {
    entity GeneralConfig as projection on po.GeneralConfig;

    entity ExcludedVendors as projection on po.ExcludedVendors;

    entity ExcludedPlants as projection on po.ExcludedPlants;

    entity ExcludedItemCats as projection on po.ExcludedItemCats;

    entity ExcludedPhrases as projection on po.ExcludedPhrases;

    @cds.redirection.target: true
    @readonly
    entity PRRuns as projection on po.PRRuns actions {
        action retry() returns PRRuns;
        action setToFail() returns PRRuns;
    };

    @readonly
    entity PRRunMessages as projection on po.PRRunMessages;

    @readonly
    entity PRRunStatusCounts as projection on po.PRRunStatusCounts;
}

annotate AdminService.PRRuns with @(
    Aggregation.ApplySupported: {
        GroupableProperties: [ status ],
        AggregatableProperties: [ { Property: ID } ]
    },
    Analytics.AggregatedProperty #RunCount: {
        Name: 'runCount',
        AggregatableProperty: ID,
        AggregationMethod: 'countdistinct',
        @Common.Label: 'Runs'
    },
    UI.HeaderInfo: {
        TypeName: 'PR Run',
        TypeNamePlural: 'PR Runs',
        Title: { Value: prNumber },
        Description: { Value: status }
    },
    UI.SelectionFields: [ prNumber, status, poNumber, changeMarker, createdAt, modifiedAt ],
    UI.Chart #StatusDistribution: {
        $Type: 'UI.ChartDefinitionType',
        Title: 'Runs by Status',
        ChartType: #Column,
        Dimensions: [ status ],
        DynamicMeasures: [ '@Analytics.AggregatedProperty#RunCount' ]
    },
    UI.PresentationVariant: {
        Visualizations: [
            '@UI.Chart#StatusDistribution',
            '@UI.LineItem'
        ]
    },
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: prNumber, Label: 'PR Number' },
        { $Type: 'UI.DataField', Value: status, Label: 'Status' },
        { $Type: 'UI.DataField', Value: poNumber, Label: 'PO Number' },
        { $Type: 'UI.DataField', Value: changeMarker, Label: 'Change Marker' },
        { $Type: 'UI.DataField', Value: createdAt, Label: 'Created At' },
        { $Type: 'UI.DataField', Value: modifiedAt, Label: 'Modified At' },
        { $Type: 'UI.DataFieldForAction', Action: 'AdminService.retry', Label: 'Retry' },
        { $Type: 'UI.DataFieldForAction', Action: 'AdminService.setToFail', Label: 'Set to Fail' }
    ],
    UI.FieldGroup #General: {
        Data: [
            { $Type: 'UI.DataField', Value: prNumber, Label: 'PR Number' },
            { $Type: 'UI.DataField', Value: status, Label: 'Status' },
            { $Type: 'UI.DataField', Value: poNumber, Label: 'PO Number' },
            { $Type: 'UI.DataField', Value: changeMarker, Label: 'Change Marker' },
            { $Type: 'UI.DataField', Value: createdAt, Label: 'Created At' },
            { $Type: 'UI.DataField', Value: modifiedAt, Label: 'Modified At' }
        ]
    },
    UI.Facets: [
        { $Type: 'UI.ReferenceFacet', ID: 'General', Label: 'General', Target: '@UI.FieldGroup#General' },
        { $Type: 'UI.ReferenceFacet', ID: 'Messages', Label: 'Messages', Target: 'messages/@UI.LineItem' }
    ]
);

annotate AdminService.PRRunMessages with @(
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: subProcess, Label: 'Sub Process' },
        { $Type: 'UI.DataField', Value: step, Label: 'Step' },
        { $Type: 'UI.DataField', Value: outcome, Label: 'Outcome' },
        { $Type: 'UI.DataField', Value: message, Label: 'Message' },
        { $Type: 'UI.DataField', Value: createdAt, Label: 'Created At' }
    ]
);

annotate AdminService.PRRunStatusCounts with @(
    Aggregation.ApplySupported: {
        GroupableProperties: [ status ],
        AggregatableProperties: [ { Property: count } ]
    },
    UI.Chart #StatusDistribution: {
        $Type: 'UI.ChartDefinitionType',
        Title: 'Runs by Status',
        ChartType: #Column,
        Dimensions: [ status ],
        Measures: [ count ]
    },
    UI.LineItem: [
        { $Type: 'UI.DataField', Value: status, Label: 'Status' },
        { $Type: 'UI.DataField', Value: count, Label: 'Runs' }
    ]
);
