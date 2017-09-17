// utility
const assign = (obj, overrides) => Object.assign({}, obj, overrides);
const isUndefined = a => typeof a === 'undefined';

// schema object
function init(_validate) {
  const schema = {};
  schema._validate = _validate;
  schema.then = then(schema);
  schema.lt = lt(schema);
  schema.gt = gt(schema);
  schema.min = min(schema);
  schema.max = max(schema);
  schema.required = required(schema);
  schema.default = _default(schema);
  schema.validate = validate(schema);
  return schema;
}

// conversion
const then = schema => f => init((value, context) => {
  const newValue = schema._validate(value, context);
  if (newValue instanceof Error) {
    return newValue;
  }
  return f(newValue, context);
});

// pipes
const pipe = toFunction => schema => args => schema.then(toFunction(args));
const equal = pipe(expect => value => expect === value ? value : new Error(value + ' should be equal to ' + expected));
const lt = pipe(limit => value => (value < limit) ? value : new Error(value + ' should be less than ' + limit));
const gt = pipe(limit => value => (value > limit) ? value : new Error(value + ' should be greater than ' + limit));
const min = pipe(limit => value => (value >= limit) ? value : new Error(value + ' should not be less than ' + limit));
const max = pipe(limit => value => (value <= limit) ? value : new Error(value + ' should not be greater than ' + limit));
const required = pipe(_ => value => !isUndefined(value) ? value : new Error(value + ' is required'));
const _default = pipe(defaultValue => value => isUndefined(value) ? defaultValue : value);

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
