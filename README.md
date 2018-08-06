# API Blueprint to Postman

## Quick Start
1. Install NodeJS https://nodejs.org/en/download/current/

2. Setup NPM to use our internal proxies
    ```
    npm config set proxy http://gateway.zscalertwo.net:10093/
    npm config set https-proxy http://gateway.zscalertwo.net:10093/
    ```

3. Install the package globally
    ```
    npm i -g git+https://github.jci.com/jchrisco/apib-2postman
    ```

4. Run the command to generate a Postman collection and environment
    ```
    apib2postman my-blueprint.md -o collection.json -e environment.json
    ```

## Command Line Options
```
apib2postman <api-blueprint.apib> [options]
```

* `-o <output>`, `--output <output>`

    Default `stdout`

    Specify a file for where the collection will be saved.

* `-e <env-output>`, `--environment <env-output>`

    Default `API.postman_environment.json`

    Specify a file for where the environment template will be saved.

* `-t <test-template>`, `--testTemplate <test-template>`

    Default `templates/postman/actions/js-tests.hbs`

    Specify a handlebar template to be used for each action's Postman tests. Variables are listed below which can be used within the template.

## Postman Test Template
Some JS tests have been created which get templated and attached to every action. The default tests exist at `templates/postman/js-tests.hbs`

This template is applied to every action and the variables which get passed to this template are as follows:

| Name | Description | Example |
| ---- | ----------- | ------- |
| pathName | The path of the group collection as a standardized name. | `networkDevices_` for /api/networkDevices/:id |
| statusCode | The expected status code for the action | `200` |
| headers | The expected headers to be returned | `[ { key: "Accept", value: "application/json" } ]` |
| schema | The JSON schema for the action's response | `{ large schema here... }` |
| isPageable | Returns true if the response schema has a collection within | `true` |
| sortParams | The accepted sort parameters parsed from the sort query parameter description | `[ "name", "category" ]` |