const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const packageJson = require('../package.json');

test('HTML5 apps define Work Zone routes at the app root', () => {
  for (const appDir of packageJson.sapux) {
    const xsAppPath = path.join(root, appDir, 'xs-app.json');
    assert.ok(fs.existsSync(xsAppPath), `${appDir} must include xs-app.json beside ui5.yaml`);

    const xsApp = JSON.parse(fs.readFileSync(xsAppPath, 'utf8'));
    const sources = xsApp.routes.map((route) => route.source);

    assert.ok(sources.includes('^/odata/(.*)$'), `${appDir} routes CAP OData requests`);
    assert.equal(xsApp.routes.at(-1).service, 'html5-apps-repo-rt', `${appDir} falls back to HTML5 repo runtime`);
  }
});

test('HTML5 app bootstrap is stable from static CAP webapp paths', () => {
  for (const appDir of packageJson.sapux) {
    const indexPath = path.join(root, appDir, 'webapp', 'index.html');
    const indexHtml = fs.readFileSync(indexPath, 'utf8');

    assert.match(indexHtml, /src="https:\/\/sapui5\.hana\.ondemand\.com\/1\.136\.7\/resources\/sap-ui-core\.js"/, `${appDir} bootstraps UI5 from the versioned SAPUI5 CDN`);
    assert.doesNotMatch(indexHtml, /src="\/?resources\/sap-ui-core\.js"/, `${appDir} does not resolve UI5 under the local webapp path`);
  }
});

test('HTML5 app builds copy xs-app.json into dist artifacts', () => {
  for (const appDir of packageJson.sapux) {
    const appPackagePath = path.join(root, appDir, 'package.json');
    const appPackage = JSON.parse(fs.readFileSync(appPackagePath, 'utf8'));

    assert.match(appPackage.scripts['build:cf'], /xs-app\.json/, `${appDir} build:cf copies xs-app.json into dist`);
  }
});
