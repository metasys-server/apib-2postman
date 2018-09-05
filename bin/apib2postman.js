#!/usr/bin/env node

const fs = require('fs');
const eol = require('eol');
const path = require('path');
const nopt = require('nopt');
const apibIncludeDirective = require('apib-include-directive');
const apib2postman = require('../src/index.js');

var options = nopt({
    'output': String,
    'environment': String,
    'testTemplate': String,
    'help': Boolean
}, {
    'o': ['--output'],
    'e': ['--environment'],
    't': ['--testTemplate'],
    'h': ['--help']
});

if (options.help || options.argv.remain.length === 0) {
    console.log("apib2postman [options]");
    console.log("Converts API Blueprint specification to Postman Collection v2.1");
    console.log("");
    console.log("Usage:");
    console.log(" apib2postman");
    console.log(" apib2postman api.md");
    console.log(" apib2postman api.md -o collection.json -e environment.json");
    console.log("");
    console.log("Options:")
    console.log("  -h --help Print this help and exit.");
    console.log("  -o --output <file> Output result to file.");
    console.log("  -e --environment <file> The output file for the Postman environment.");
    console.log("  -t --testTemplate <template.hbs> The postman test template to use for each action.");
    process.exit();
}

const input = options.argv.remain[0];
const collectionFile = options.output || 'API.postman_collection.json';
const environmentFile = options.environment || 'API.postman_environment.json';
const includePath = input ? path.dirname(input) : process.cwd();
var apibData = '';

fs.createReadStream(input).on('data', (chunk) => {
    apibData += chunk;
}).on('end', () => {
    try {
        apibData = apibIncludeDirective.includeDirective(includePath, apibData);
    } catch (e) {
        console.error(e.toString());
        process.exit(-1);
        return;
    }
    console.log('Processing API Blueprint...');
    processBlueprint(eol.lf(apibData), options);
});

function processBlueprint(blueprint, opts) {
    console.log('Converting to Postman Collection...');

    apib2postman.convert(blueprint, options, function (error, result) {
        if (error) {
            console.error(error);
            process.exit(-1);
            return;
        }
        var { postman, environment } = result;
        var dataEnv = JSON.stringify(environment, null, 4);

        console.log('Saving Postman collection and environment...');
        fs.writeFileSync(collectionFile, postman);
        fs.writeFileSync(environmentFile, dataEnv);
        console.log('Done!');
    });
}
