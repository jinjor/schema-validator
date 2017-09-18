const predefinedPlugins = require('./plugins.js');

// schema object
const init = (plugins, _validate, context) => {
  const schema = {};
  schema._validate = _validate || (value => value);
  schema.context = context || {
    name: 'value'
  };
  schema.init = (v, context) => init(plugins, v, context || schema.context);
  schema.withContext = withContext(schema);
  schema.then = then(schema);
  schema.next = next(schema);
  schema.check = check(schema);
  schema.validate = validate(schema);
  schema.reject = reject(schema);
  addPlugins(schema, plugins);
  return schema;
};

const addPlugins = (schema, plugins) => {
  plugins.forEach(addPlugin(schema));
};

const addPlugin = schema => plugin => {
  Object.keys(plugin).forEach(key => {
    if (schema[key]) {
      throw new Error(`PluginError: Function ${key} is already defined.`);
    }
    const f = plugin[key];
    if (typeof f !== 'function') {
      throw new Error(`PluginError: Plugin ${key} is mulformed. Value should be a function.`);
    }
    schema[key] = f(schema);
  });
}

// validate
class SchemaValidationError {
  constructor(message) {
    this.message = message;
  }
}
const reject = schema => message => {
  return new SchemaValidationError(message);
};
const validate = schema => value => {
  var newValue = schema._validate(value);
  if (newValue instanceof SchemaValidationError) {
    throw makeError(schema.context.name, newValue.message, value);
  }
  if (newValue && newValue._validate) {
    return validate(newValue)(value);
  }
  return newValue;
};

// conversion
const makeError = (name, message, value) => {
  value = JSON.stringify(value, null, 2);
  return new Error(name + ' ' + message + ', but got ' + value);
};
const withContext = schema => additional => {
  return schema.init(schema._validate, Object.assign({}, schema.context, additional || {}));
};
const then = schema => f => schema.init(value => {
  const newValue = schema._validate(value);
  if (newValue instanceof SchemaValidationError) {
    return newValue;
  }
  if (newValue && newValue._validate) {
    return f(newValue.validate(value));
  }
  return f(newValue);
});
const next = schema => nextSchema => schema.then(value => {
  return nextSchema.validate(value);
});
const check = schema => f => schema.then(value => {
  const message = f(value);
  if (message) {
    return schema.reject(message);
  } else {
    return value;
  }
});

module.exports = userPlugin => {
  return init(predefinedPlugins.concat([userPlugin || {}]));
};
