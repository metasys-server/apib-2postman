#!/usr/bin/env node

var fs = require('fs'),
    path = require('path'),
    nopt = require('nopt'),
    apibIncludeDirective = require('apib-include-directive'),
    apib2postman = require('../src/index.js');

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

if (options.help) {
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
    console.log("  -o --output <file> Output result to file instead of STDOUT.");
    console.log("  -e --environment <file> The output file for the Postman environment.");
    console.log("  -t --testTemplate <template.hbs> The postman test template to use for each action.");
    process.exit();
}

const input = options.argv.remain[0];
var output = options.output || '-';
var includePath = input ? path.dirname(input) : process.cwd();
var apibData = '';

(input ? fs.createReadStream(input) : process.stdin)
    .on('data', (chunk) => {
        apibData += chunk;
    }).on('end', () => {
        try {
            apibData = apibIncludeDirective.includeDirective(includePath, apibData);
        } catch (e) {
            console.log(e.toString());
            return;
        }
        if (output !== '-') {
            console.log('Processing API Blueprint...');
        }
        processBlueprint(apibData, options);
    });

function processBlueprint(blueprint, opts) {
    if (output !== '-') {
        console.log('Converting to Postman Collection...');
    }

    apib2postman.convert(blueprint, options, function (error, result) {
        if (error) {
            console.log(error);
            return;
        }
        var { postman, environment } = result;
        var dataEnv = JSON.stringify(environment, null, 4);
        if (output !== '-') {
            console.log('Saving Postman collection and environment...');
            fs.writeFileSync(output, postman);
            fs.writeFileSync(options.environment || 'API.postman_environment.json', dataEnv);
            console.log('Done!');
        } else {
            console.log(postman);
        }
    });
}
