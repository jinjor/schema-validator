// utility
const assign = (obj, overrides) => Object.assign({}, obj, overrides);
const isUndefined = a => typeof a === 'undefined';

// schema object
const init = (plugins, _validate) => {
  const schema = {};
  schema._plugins = plugins;
  schema._validate = _validate || (value => value);
  schema.then = then(schema);
  schema.validate = validate(schema);
  plugins.forEach(plugin => {
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
  });
  return schema;
};

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

const pipe = toFunction => schema => (arg1, arg2, arg3, arg4) => schema.then(toFunction(arg1, arg2, arg3, arg4));

// conversion
const then = schema => f => init(schema._plugins, (value, context) => {
  const newValue = schema._validate(value, context);
  if (newValue instanceof Error) {
    return newValue;
  }
  return f(newValue, context);
});

// basic plugin
const basics = {
  equal: pipe(expect => value => (expect === value) ? value : new Error(value + ' should be equal to ' + expected)),
  lt: pipe(limit => value => (value < limit) ? value : new Error(value + ' should be less than ' + limit)),
  gt: pipe(limit => value => (value > limit) ? value : new Error(value + ' should be greater than ' + limit)),
  min: pipe(limit => value => (value >= limit) ? value : new Error(value + ' should not be less than ' + limit)),
  max: pipe(limit => value => (value <= limit) ? value : new Error(value + ' should not be greater than ' + limit)),
  required: pipe(_ => value => !isUndefined(value) ? value : new Error(value + ' is required')),
  default: pipe(defaultValue => value => isUndefined(value) ? defaultValue : value),
};

// types plugin
const checkType = (typeName, value) => {
  if (isUndefined(value)) {
    return value;
  }
  return (typeof value === typeName) ? value : new Error(value + ' is not a ' + typeName)
}
const types = {
  typeOf: pipe(typeName => value => checkType(typeName, value)),
  boolean: pipe(_ => value => checkType('boolean', value)),
  number: pipe(_ => value => checkType('number', value)),
  string: pipe(_ => value => checkType('string', value)),
  func: pipe(_ => value => checkType('function', value)),
};

// structures plugin
const structures = {
  array: pipe(itemSchema => value => {
    if (isUndefined(value)) {
      return value;
    }
    if (isUndefined(value.length)) {
      return new Error(value + ' is not an array');
    }
    return value.map(item => {
      if (isUndefined(itemSchema)) {
        return item;
      }
      return itemSchema.validate(item);
    });
  }),
  object: pipe(schemaGenerators => value => {
    return (schemaGenerators || []).reduce((memo, toSchema) => {
      return assign(memo, toSchema(memo).validate(value));
    }, {});
  }),
  field: pipe((key, schema) => value => {
    const v = value[key];
    return {
      [key]: schema.validate(v)
    };
  }),
};

module.exports = options => {
  options = options || {
    plugins: []
  };
  return init([basics, types, structures].concat(options.plugins));
};
