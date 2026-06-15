const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const packageJson = require('../package.json');

test('HTML5 apps package approuter routes for UI5 resources and CAP services', () => {
  for (const appDir of packageJson.sapux) {
    const xsAppPath = path.join(root, appDir, 'webapp', 'xs-app.json');
    assert.ok(fs.existsSync(xsAppPath), `${appDir} must include webapp/xs-app.json so it is copied into dist`);

    const xsApp = JSON.parse(fs.readFileSync(xsAppPath, 'utf8'));
    const sources = xsApp.routes.map((route) => route.source);

    assert.ok(sources.includes('^/odata/(.*)$'), `${appDir} routes CAP OData requests`);
    assert.ok(sources.includes('^/resources/(.*)$'), `${appDir} routes UI5 resources`);
    assert.ok(sources.includes('^/test-resources/(.*)$'), `${appDir} routes UI5 test resources`);
    assert.equal(xsApp.routes.at(-1).service, 'html5-apps-repo-rt', `${appDir} falls back to HTML5 repo runtime`);
  }
});

test('HTML5 app bootstrap uses proxied UI5 resources', () => {
  for (const appDir of packageJson.sapux) {
    const indexPath = path.join(root, appDir, 'webapp', 'index.html');
    const indexHtml = fs.readFileSync(indexPath, 'utf8');

    assert.match(indexHtml, /src="resources\/sap-ui-core\.js"/, `${appDir} bootstraps UI5 through app proxy`);
    assert.doesNotMatch(indexHtml, /sapui5\.hana\.ondemand\.com|ui5\.sap\.com/, `${appDir} does not hard-code the UI5 CDN`);
  }
});
