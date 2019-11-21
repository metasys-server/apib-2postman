const _ = require('lodash'),
      drafter = require('drafter.js'),
      UriTemplate = require('uritemplate'),
      Handlebars = require('handlebars'),
      postmanGenerator = require('./generators/postman'),
      fs = require('fs');

Handlebars.registerHelper('json', function (obj) {
  return JSON.stringify(obj, null, 4);
});

function apib2postman(apib, options) {
  const title = apib.content[0].meta.title;

  const collection = {
    title,
    items: []
  };

  const environment = {
    name: title,
    values: []
  };

  addEnvVariables(environment.values, ['base_url', 'username', 'password', 'include_sad_tests']);

  apib.content[0].content
    .filter(content => content.element === 'category')
    .forEach(category => {
      const title = category.meta.title;
      const groups = [];

      category.content
        .filter(content => content.element === 'resource')
        .forEach(resource => {
          const uriTemplate = UriTemplate.parse(resource.attributes.href);
          const pathName = getPathName(uriTemplate);
          const path = parsePath(uriTemplate);
          const attributes = parseAttributes(resource.attributes.hrefVariables, uriTemplate);

          const baseAction = {
            path: path,
            query: attributes.query,
            variables: attributes.variable
          };

          const actions = parseActions(
            baseAction,
            resource.content.filter(x => x.element === 'transition'),
            environment
          );

          addEnvVariables(environment.values, attributes.envVariable);

          groups.push({
            name: resource.meta.title,
            description: parseCopy(resource.content),
            path: pathName,
            actions: actions
          });
        });

      if (groups.length > 0) {
        collection.items.push({
          name: title,
          description: parseCopy(category.content),
          groups: groups
        });
      }
    });

  return postmanGenerator(_.cloneDeep(collection), _.cloneDeep(environment), options);
}

function parsePath(uriTemplate) {
  const params = {};

  for (let exp of uriTemplate.expressions) {
    if (!exp.varspecs) continue;
    if (exp.operator.symbol === '?') continue; // query
    for (let spec of exp.varspecs) {
      params[spec.varname] = ':' + spec.varname;
    }
  }

  return decodeURIComponent(uriTemplate.expand(params)).split('/').slice(1);
}

function parseActions(baseAction, actions, environment) {
  return actions.map(action => {
    const transaction = _.find(action.content, x => x.element === 'httpTransaction');
    const request = parseRequest(_.find(transaction.content, x => x.element === 'httpRequest'));

    let newAction = baseAction;

    if (action.attributes) {
      const uriTemplate = UriTemplate.parse(action.attributes.href);
      const path = parsePath(uriTemplate);
      const attributes = parseAttributes(action.attributes.hrefVariables, uriTemplate);

      newAction = _.merge({}, newAction, {
        path: path
      });

      newAction.query.push(...attributes.query);
      newAction.variables.push(...attributes.variable);

      addEnvVariables(environment.values, attributes.envVariable);
    }

    const response = parseResponse(_.find(transaction.content, x => x.element === 'httpResponse'));

    return _.merge({}, newAction, {
      name: action.meta.title,
      description: parseCopy(action.content),
      request: request,
      response: response
    });
  });
}

function parseAttributes(attributes, uriTemplate) {
  const result = {
    query: [],
    variable: [],
    envVariable: []
  };

  if (!attributes) return result;

  const pathName = getPathName(uriTemplate);

  attributes.content.forEach(attr => {
    const defaultValue = attr.content.value.attributes ? attr.content.value.attributes.default : null;
    const name = attr.content.key.content;
    const type = getParamType(name, uriTemplate);

    const param = {
      key: name,
      value: defaultValue || `{{${pathName}${name}}}`,
      description: attr.meta.description
    };

    (type === 'query'
      ? result.query
      : result.variable
    ).push(param);

    if (!defaultValue) {
      result.envVariable.push(pathName + name);
    }
  });

  uriTemplate.expressions.filter(x => x.templateText && !x.templateText.startsWith('?')).forEach(variable => {
    const name = variable.templateText;

    if (!result.variable.some(x => x.key === name)) {
      result.variable.push({
        key: name,
        value: `{{${pathName}${name}}}`
      });
  
      result.envVariable.push(pathName + name);
    }
  });

  return result;
}

function parseRequest(request) {
  const { method, headers } = request.attributes;

  return {
    method: method,
    headers: parseRequestHeaders(headers),
    body: parseRequestBody(request.content)
  };
}

function parseHeaders(headers) {
  return _.map(headers, header => ({
    key: header.content.key.content,
    value: header.content.value.content
  }));
}

function parseRequestHeaders(headers) {
  return parseHeaders(headers.content.filter(x => x.content.key.content !== 'Authorization'));
}

function parseResponse(response) {
  return {
    statusCode: response.attributes.statusCode,
    headers: response.attributes.headers ? parseHeaders(response.attributes.headers.content) : {},
    body: parseContent(response.content, 'messageBody').content,
    jsonSchema: parseJsonSchema(response.content),
    tests: parseBodyTests(response.content)
  };
}

function parseRequestBody(content) {
  const requestBody = parseContent(content, 'messageBody');

  let mode = 'raw';
  let body = requestBody.content;

  if (requestBody.attributes && requestBody.attributes.contentType === 'application/x-www-form-urlencoded') {
    const props = body.trim().split('&');

    mode = 'urlencoded';
    body = props.map(x => ({
      key: x.split('=')[0],
      value: x.split('=')[1],
      type: 'text'
    }));
  }

  return {
    mode: mode,
    [mode]: body
  };
}

function parseBodyTests(content) {
  const testStr = parseContent(content, 'messageBody').content;
  if (!testStr) return null;

  const tests = new RegExp(/^.*\+ Tests\n\n        (.*)$/gm).exec(testStr);
  if (!tests) return null;

  return tests[1].split(/\r\n?|\n/g);
}

function parseJsonSchema(content) {
  try {
    const schema = JSON.parse(parseContent(content, 'messageBodySchema').content);

    if (schema) {
      return schema;
    }
  } catch (e) {}

  return null;
}

function parseContent(content, className, elementName) {
  const found = _.find(content, x => x.element === (elementName || 'asset') && _.includes(x.meta.classes, className));
  return found ? found : { content: '' };
}

function parseCopy(content) {
  const copy = _.find(content, x => x.element === 'copy');
  return copy ? copy.content : '';
}

function getParamType(name, uriTemplate) {
  if (!uriTemplate) return 'body';
  for (var i = 0; i < uriTemplate.expressions.length; i++) {
    var exp = uriTemplate.expressions[i];
    if (!exp.varspecs) continue;
    for (var j = 0; j < exp.varspecs.length; j++) {
      var spec = exp.varspecs[j];
      if (spec.varname === name) {
        return exp.operator.symbol === '?' ? 'query' : 'path';
      }
    }
  }
  return 'body'; // TODO: decide 'header', 'formData', 'body'
}

function getPathName(uriTemplate) {
  let pathRoute = '';

  uriTemplate.expressions
    .filter((exp) => exp.literal)
    .slice(0, 1)
    .forEach((exp) => pathRoute += exp.literal.replace(/\//g, '') + '_');

  return pathRoute;
}

function addEnvVariables(envVariables, variables) {
  variables.forEach(variable => {
    if (!envVariables.some(x => x.key === variable)) {
      envVariables.push({
        key: variable,
        value: '',
        enabled: true,
        type: 'text'
      });
    }
  });
}

exports.convert = function (data, options, callback) {
  try {
    drafter.parse(data, {}, (err, result) => {
      if (err) {
        if (err.result) {
          return callback(`Error: ${JSON.stringify(err.result)}`);
        }
        return callback(err);
      }
  
      try {
        const newResult = apib2postman(result, options);
        return callback(null, newResult);
      } catch (error) {
        return callback(error);
      }
    });
  } catch (e) {
    console.error(e);
  }
};
