# Welcome To Phoenix!

**Website: <a href="https://phcode.io" target="_blank" title="PHCode.io">PHCode.io</a>**

Phoenix is a modern open-source and <a href="https://www.gnu.org/philosophy/free-sw.en.html" target="_blank" title="Free software">free software</a> text editor
designed to make coding as simple and fun as playing a video game.

#### Code Guardian
[![Phoenix Build verification](https://github.com/phcode-dev/phoenix/actions/workflows/build_verify.yml/badge.svg)](https://github.com/phcode-dev/phoenix/actions/workflows/build_verify.yml)

<a href="https://sonarcloud.io/summary/new_code?id=phcode-dev_phoenix" target="_blank" title="Phoenix's SonarCloud Summary">
    <img src="https://sonarcloud.io/api/project_badges/measure?project=phcode-dev_phoenix&metric=alert_status" alt="Sonar Code Quality Check" title="Sonar Code Quality Check">
    <img src="https://sonarcloud.io/api/project_badges/measure?project=phcode-dev_phoenix&metric=security_rating" alt="Security Rating" title="Security Rating">
    <img src="https://sonarcloud.io/api/project_badges/measure?project=phcode-dev_phoenix&metric=vulnerabilities" alt="Vulnerabilities" title="Vulnerabilities">
    <img src="https://sonarcloud.io/api/project_badges/measure?project=phcode-dev_phoenix&metric=coverage" alt="Code Coverage" title="Code Coverage">
    <img src="https://sonarcloud.io/api/project_badges/measure?project=phcode-dev_phoenix&metric=bugs" alt="Code Bugs" title="Code Bugs">
    <img src="https://sonarcloud.io/api/project_badges/measure?project=phcode-dev_phoenix&metric=reliability_rating" alt="Reliability Rating" title="Reliability Rating">
    <img src="https://sonarcloud.io/api/project_badges/measure?project=phcode-dev_phoenix&metric=sqale_rating" alt="Maintainability Rating" title="Maintainability Rating">
    <img src="https://sonarcloud.io/api/project_badges/measure?project=phcode-dev_phoenix&metric=ncloc" alt="Lines Of Code" title="Lines Of Code">
    <img src="https://sonarcloud.io/api/project_badges/measure?project=phcode-dev_phoenix&metric=sqale_index" alt="Technical Debt" title="Technical Debt">
</a>
<a href="https://www.npmjs.com/package/git-commit-msg-linter" target="_blank" title="Commit msg linted by git-commit-msg-linter">
    <img src="https://badgen.net/badge/git-commit-msg-linter/3.0.0/green" alt="Commit msg linted by git-commit-msg-linter">
</a>

##### Error And App Stability Monitoring Powered By
<a href="https://www.bugsnag.com/" target="_blank" title="Bugsnag">
    <img src="https://assets-global.website-files.com/607f4f6df411bd01527dc7d5/63bc40cd9d502eda8ea74ce7_Bugsnag%20Full%20Color.svg" alt="Bugsnag" style="width: 200px;">
</a>

#### Development Status: Stable/Active.

<img src="https://user-images.githubusercontent.com/5336369/191202975-6069d270-526a-443d-bd76-903353ae1222.png" alt="Phoenix Code Editor">

## Tenets
1. Targeted for web development. HTML, CSS, and JavaScript enjoy special status.
2. Game UX - Approach code editing like a game that a school kid would play after skipping the tutorial.
2. Light-weight editor.
3. Extension support maintaining full compatibility with Brackets extensions (Except Brackets-node extensions).
4. Uncompromised local development experience.
5. Support for pluggable remote back-ends.
6. Phoenix core will work from a static web server.
7. Source code in release builds will always be auditable and readable from dev-tools.

AGPL/Libre license guards your right to audit and change code that handles your data.
Phoenix usually loads up in under 1 second and loading it faster at the expense of making it hard
to read and develop is a noop. We prioritize simplicity and eaze of development. 

## Contributing/Feedback
<li><a href="https://github.com/phcode-dev/phoenix/discussions" target="_blank" title="Get In Touch With Our Community">Get In Touch With Our Community</a></li>
<li><a href="https://github.com/phcode-dev/phoenix/discussions/categories/ideas" target="_blank" title="Request A New Feature">Request A New Feature</a></li>
<li><a href="https://discord.com/invite/rBpTBPttca" target="_blank" title="Join Our Discord Community">Join Our Discord Community</a></li>
<li><a href="https://github.com/phcode-dev/phoenix/issues" target="_blank" title="Raise Issues">Raise Issues</a></li>
<li><a href="https://github.com/phcode-dev/phoenix" target="_blank" title="Contribute">Contribute</a></li>

## Building Phoenix
<li><a href="https://github.com/phcode-dev/phoenix" target="_blank" title="Source Repository">Source Repository</a></li>

* Install gulp globally once. 
  * In Mac/Linux: `sudo npm install -g gulp-cli`
  * In Windows: `npm install -g gulp-cli`
* run `npm install`
* To build after npm install: 
  * `npm run build` - generate builds close to release builds locally.
  * or `npm run build:debug` to build debug builds for development with more debug symbols.

## Running Phoenix
* run `npm run serve` in the terminal.
* Use Chrome/Edge browser to navigate to [http://localhost:8000/src](http://localhost:8000/src)

## IDE Setup
SonarLint static code analysis checker is not yet available as a Brackets
extension. Use sonarLint plugin for webstorm or any of the available
IDEs from this link before raising a pull request: <a href="https://www.sonarlint.org/" target="_blank" title="SonarLint">https://www.sonarlint.org</a>

## Building Release Artifacts

* run `npm install`
* To build the release artifacts, run one of the following commands depending on what build you want:
  * `npm run release:dev`, `npm run release:staging`, `npm run release:prod`
* The release artifacts to host will be in `dist` folder.

## Running And Debugging Tests In Browser
This is the easiest and preferred way to run Phoenix tests.
* run `npm run build` in the terminal.
  * NB: This will setup all the required files for test 
* Use Chrome/Edge browser to navigate to Phoenix [http://localhost:8000/src/index.html](http://localhost:8000/src/index.html)
* In Phoenix Menu, select `Debug > Phoenix Code Diagnostic Tools > Run Phoenix Code Tests` To open the test runner.
* Run tests as required. 
  * NB: To reset test data files, click on `reset and reload tests` option in the test runner.
* You can use the browser dev tools to debug. 

## Running And Debugging Tests In Playwright Headless Mode Or In GitHub Actions
We use <a href="https://playwright.dev" target="_blank" title="Playwright">Playwright</a> to run the headless version of our tests.
Please note that we do not use Playwright as our actual test framework, but as a headless browser (Chrome and Firefox)
to run our tests written in Jasmine/Mocha.
* run `npm run test<*>` in the terminal to run the unit tests run in GitHub actions. Eg. `npm run testChromium`.
* To debug the tests, `npm run test<*>Debug`. Eg. `npm run testFirefoxDebug`. However, we recommend using the
above `Running tests in browser` section to actually fix/debug tests that are failing in the pipeline.
It has much better debug UX and fixing it directly in the browser will almost certainly fix it in playwright.
* To run integration tests use command: `npx cross-env TEST_ENV=<integration suite name> npm run test<*>`
  * The allowed integration test suite names are: `integration, LegacyInteg, mainview, livepreview`.
    You can get these suite names from the test runner.
  * e.g.: `npx cross-env TEST_ENV=integration npm run testChromium`
* To debug integration tests use command: ` npx cross-env TEST_ENV=<integration suite name> npm run test<*>Debug`
  * e.g.: `npx cross-env TEST_ENV=mainview npm run testChromiumDebug` 

### Running Tests In Dev Staging And Prod Stacks In Playwright
#### To run tests against these stacks locally, follow these steps:
1. Build the release using `npm run release:<stage>`. Eg: `npm run release:dev`
2. Run the unit tests using format: `npm run test<*>Dist`. Eg. `npm run testChromiumDist`.
3. Run the integration tests using the format: `npx cross-env TEST_ENV=<integration suite name> npm run test<*>Dist`. Eg. `npx cross-env TEST_ENV=mainview npm run testChromiumDist`.
 
#### To Run Tests Against These Stacks Go To The Following URL: 
* Dev: https://dev.phcode.dev/test/SpecRunner.html
* Staging: https://staging.phcode.dev/test/SpecRunner.html
* Prod: https://phcode.dev/test/SpecRunner.html

## Browsing The Virtual File System
To view/edit the files in the browser virtual file system in Phoenix:
`debug menu> Open Virtual File System`

## Clean And Reset Builds
* Clean builds only: `npm run clean`

## Previewing Changes In Dev And Staging
One a pull request is merged, it will be automatically deployed to dev.phcode.dev . To view the changes:
1. goto https://dev.phcode.dev/devEnable.html and click `enable dev.phcode.dev` . only needs to be done once.
2. goto https://dev.phcode.dev to preview your changes. If it is a recent change, you might need to wait for
up to 15 minutes before the changes are deployed to the dev stage. Reload page a few times to get the latest
dev build and reset cached content.

The process is the same for `staging.phcode.dev`. Builds that are verified in development will be pushed
periodically to staging. To view staging:
1. goto https://staging.phcode.dev/devEnable.html and click `enable staging.phcode.dev` . only needs to be done once.
2. goto https://staging.phcode.dev to preview your changes.  If it is a recent change, you might need to wait for
   up to 15 minutes before the changes are deployed to the dev stage. Reload page a few times to get the latest
   dev build and reset cached content.

## Deployment To PHCode.dev
* All changes pushed to the main branch are automatically published to https://dev.phcode.dev 
* To publish the changes to https://staging.phcode.dev , push changes to the `staging` branch in this repo with a pull request.
* Once the changes are validated and tested, trigger a prod deployment by pushing to the `prod` branch.

## Acknowledgements
* Phoenix is based on the Brackets code editor by Adobe. Find out more on <a href="https://github.com/adobe/brackets" target="_blank" title="Adobe Brackets">Adobe Brackets here</a>.
* Our main code editor library <a href="https://codemirror.net" target="_blank" title="CodeMirror">CodeMirror</a>
* Inspired by previous work from the <a href="https://github.com/mozilla/thimble.mozilla.org" target="_blank" title="Mozilla Thimble">Mozilla Thimble</a> project to port Brackets to the web. <a href="https://github.com/mozilla/brackets" target="_blank" title="Mozilla/Brackets">https://github.com/mozilla/brackets</a>
* In browser server based on <a href="https://github.com/humphd/nohost" target="_blank" title="Nohost">Nohost</a> by <a href="https://github.com/humphd" target="_blank" title="David Humphrey">David Humphrey</a>


## License
Discussion: <a href="https://github.com/phcode-dev/phoenix/issues/184" target="_blank" title="License Discussion">https://github.com/phcode-dev/phoenix/issues/184</a>

GNU AGPL-3.0 License

Copyright (C) 2021-Present Core.ai

Based on Backets, Copyright (C) 2012 Adobe Systems Incorporated and the Brackets.io community

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (At your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; Without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see https://opensource.org/licenses/AGPL-3.0.

