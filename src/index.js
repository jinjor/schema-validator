const predefinedPlugins = require('./plugins.js');

// schema object
const init = (plugins, _validate) => {
  const schema = {};
  schema._plugins = plugins;
  schema._validate = _validate || (value => value);
  schema.init = v => init(plugins, v);
  schema.then = then(schema);
  schema.next = next(schema);
  schema.check = check(schema);
  schema.validate = validate(schema);
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
const initialContext = {};
const validate = schema => value => {
  var newValue = schema._validate(value, initialContext);
  if (newValue instanceof Error) {
    throw newValue;
  }
  if (newValue && newValue._validate) {
    return validate(newValue)(value);
  }
  return newValue;
};

// conversion
const then = schema => f => schema.init((value, context) => {
  const newValue = schema._validate(value, context);
  if (newValue instanceof Error) {
    return newValue;
  }
  return f(newValue, context);
});
const next = schema => nextSchema => schema.then(value => {
  return nextSchema.validate(value);
});
const check = schema => f => schema.then(value => {
  const message = f(value);
  return message ? new Error(message) : value;
});

module.exports = userPlugin => {
  userPlugin = userPlugin || {};
  return init(predefinedPlugins.concat([userPlugin]));
};
