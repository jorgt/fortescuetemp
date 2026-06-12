using { cuid, managed, sap } from '@sap/cds/common';

namespace com.fortescue.lowvalueprtopo;

entity GeneralConfig: cuid, managed, sap.common.CodeList {
    value: String
}

entity ExcludedVendors: cuid, managed, sap.common.CodeList {
    value: String
}

entity ExcludedPlants: cuid, managed, sap.common.CodeList {
    value: String
}

entity ExcludedItemCats: cuid, managed, sap.common.CodeList {
    value: String
}

entity ExcludedPhrases: cuid, managed, sap.common.CodeList {
    value: String
}

entity PRRuns: cuid, managed {
    @unique prNumber: String(10);
    changeMarker: String; //if we have an etag or something
    status: String enum {
        new;
        inProgress;
        outOfScope;
        fidelityFail;
        extractionFail;
        quoteFidelityFail;
        posted;
    }
    poNumber: String(10);
    payload: LargeString;
    messages: Composition of many PRRunMessages on messages.run = $self;
}

entity PRRunMessages: cuid, managed {
    run: Association to PRRuns;
    subProcess: Integer;
    step: String;
    outcome: String enum { pass; fail; skipped; not_applicable; }
    message: String;
}
