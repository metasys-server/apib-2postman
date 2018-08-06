const _ = require('lodash'),
      fs = require('fs'),
      path = require('path'),
      Handlebars = require('handlebars');

Handlebars.registerPartial('item', fs.readFileSync('./templates/postman/item.hbs', 'utf8'));
Handlebars.registerPartial('action', fs.readFileSync('./templates/postman/action.hbs', 'utf8'));
Handlebars.registerPartial('kv-item', fs.readFileSync('./templates/postman/kv-item.hbs', 'utf8'));
Handlebars.registerPartial('test', fs.readFileSync('./templates/postman/test.hbs', 'utf8'));

const templates = {
  tests: require('../../templates/postman/actions/js-tests.hbs'),
  postman: require('../../templates/postman/index.hbs')
};

function getTestTemplate(testTemplate) {
  return testTemplate ? require(path.resolve(testTemplate)) : templates.tests;
}

function parseTests(pathName, action, testTemplate) {
  const {
    statusCode,
    headers,
    jsonSchema
  } = action.response;

  const sortQuery = action.query.find(x => x.key === 'sort');
  const sortParams = [];

  if (sortQuery) {
    const sortRegex = new RegExp(/^.*Accepted Values: (.*)$/gm);
    sortParams.push(...sortRegex.exec(sortQuery.description)[1].replace(/[` ]?/g, '').split(','));
  }

  const isPageable = !!jsonSchema.properties.items
    && !!jsonSchema.properties.next
    && jsonSchema.properties.items.type === 'array';

  const testExec = getTestTemplate(testTemplate)({
    pathName: pathName,
    statusCode: statusCode,
    headers: _.filter(headers, x => x.key !== 'Allow'),
    schema: JSON.stringify(jsonSchema, null, 2),
    isPageable: isPageable,
    sortParams: sortParams
  });

  return testExec.split(/\r\n?|\n/g);
}

module.exports = function (collection, environment, options) {
  collection.items.forEach(item => {
    item.groups.forEach(group => {
      group.actions.forEach(action => {
        action.response.tests = action.response.tests || parseTests(group.path, action, options.testTemplate);
      });
    });
  });

  return {
    postman: templates.postman(collection),
    environment: environment
  };
};
