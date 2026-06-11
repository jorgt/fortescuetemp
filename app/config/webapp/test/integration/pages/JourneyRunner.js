sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/fortescue/lowvalueprtopo/config/test/integration/pages/GeneralConfigList",
	"com/fortescue/lowvalueprtopo/config/test/integration/pages/GeneralConfigObjectPage"
], function (JourneyRunner, GeneralConfigList, GeneralConfigObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/fortescue/lowvalueprtopo/config') + '/test/flp.html#app-preview',
        pages: {
			onTheGeneralConfigList: GeneralConfigList,
			onTheGeneralConfigObjectPage: GeneralConfigObjectPage
        },
        async: true
    });

    return runner;
});

