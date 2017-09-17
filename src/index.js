// utility
const assign = (obj, overrides) => Object.assign({}, obj, overrides);
const isUndefined = a => typeof a === 'undefined';

// schema object
const makeSchemaObject = (proto, _validate) => {
  const schema = {};
  schema._validate = _validate;
  schema.then = then(schema);
  schema.validate = validate(schema);
  Object.keys(proto).forEach(key => {
    if (schema[key]) {
      throw new Error(`PluginError: Function ${key} is already defined.`);
    }
    const f = proto[key];
    if (typeof f !== 'function') {
      throw new Error(`PluginError: Plugin ${key} is mulformed. Value should be a function.`);
    }
    schema[key] = f(schema);
  });
  return schema;
};

const init = _validate => makeSchemaObject(basics, _validate);

// conversion
const then = schema => f => init((value, context) => {
  const newValue = schema._validate(value, context);
  if (newValue instanceof Error) {
    return newValue;
  }
  return f(newValue, context);
});

// basic plugin
const pipe = toFunction => schema => args => schema.then(toFunction(args));
const basics = {
  equal: pipe(expect => value => (expect === value) ? value : new Error(value + ' should be equal to ' + expected)),
  lt: pipe(limit => value => (value < limit) ? value : new Error(value + ' should be less than ' + limit)),
  gt: pipe(limit => value => (value > limit) ? value : new Error(value + ' should be greater than ' + limit)),
  min: pipe(limit => value => (value >= limit) ? value : new Error(value + ' should not be less than ' + limit)),
  max: pipe(limit => value => (value <= limit) ? value : new Error(value + ' should not be greater than ' + limit)),
  required: pipe(_ => value => !isUndefined(value) ? value : new Error(value + ' is required')),
  default: pipe(defaultValue => value => isUndefined(value) ? defaultValue : value)
};

// primitives
const succeed = value => init(_ => value);
const fail = message => init(_ => new Error(message));
const typeOf = typeName => init(value => {
  if (isUndefined(value)) {
    return value;
  }
  if (typeof value === typeName) {
    return value;
  } else {
    return new Error(value + ' is not a ' + typeName);
  }
});

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

// types
const boolean = typeOf('boolean');
const number = typeOf('number');
const string = typeOf('string');
const func = typeOf('function');
const any = init(value => value);

// structure
const array = schema => init(value => {
  schema = schema || any;
  if (isUndefined(value)) {
    return value;
  }
  if (isUndefined(value.length)) {
    return new Error(value + ' is not an array');
  }
  return value.map(item => {
    return schema.validate(item);
  });
});
const object = schemaGenerators => typeOf('object').then(value => {
  schemaGenerators = schemaGenerators || [];
  return schemaGenerators.reduce((memo, toSchema) => {
    return assign(memo, toSchema(memo).validate(value));
  }, {});
});
const field = (key, schema) => init(value => {
  return {
    [key]: schema.validate(value[key])
  };
});

module.exports = {
  boolean: boolean,
  number: number,
  string: string,
  func: func,
  object: object,
  array: array,
  field: field
};
