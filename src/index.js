// utility
const assign = (obj, overrides) => Object.assign({}, obj, overrides);

// schema object
function init(_validate) {
  const schema = {};
  schema._validate = _validate;
  schema.then = then(schema);
  schema.validate = validate(schema);
  schema.min = min(schema);
  schema.max = max(schema);
  schema.required = required(schema);
  schema.siblings = siblings(schema);
  schema.default = _default(schema);
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
const siblings = schema => toNextFields => init(value => {
  return schema.then(field => {
    const value = field[Object.keys(field)[0]];
    return toNextFields(value).reduce((memo, nextField) => {
      return assign(memo, nextField.validate(value));
    }, field);
  });
});
const _default = schema => defaultValue => schema.then(value => {
  if (typeof value === 'undefined') {
    return defaultValue;
  } else {
    return value;
  }
})
//
const min = schema => minValue => schema.then(value => {
  if (value >= minValue) {
    return value;
  }
  return new Error(value + ' should not be less than ' + minValue);
});
const max = schema => maxValue => schema.then(value => {
  if (value <= maxValue) {
    return value;
  }
  return new Error(value + ' should not be greater than ' + maxValue);
});
const required = schema => _ => schema.then(value => {
  if (typeof value !== 'undefined') {
    return value;
  }
  return new Error(value + ' is required');
});


// primitives
const succeed = value => init(_ => value);
const fail = message => init(_ => new Error(message));
const typeOf = typeName => init(value => {
  if (typeof value === 'undefined') {
    return value;
  }
  if (typeof value === typeName) {
    return value;
  } else {
    return new Error(value + ' is not a ' + typeName);
  }
});

// structure

const array = schema => init(value => {
  schema = schema || any;
  if (typeof value === 'undefined') {
    return value;
  }
  if (typeof value.length === 'undefined' || typeof value.map === 'undefined') {
    return new Error(value + ' is not an array');
  }
  return value.map(item => {
    return schema.validate(item);
  });
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
const object = fields => typeOf('object').then(value => {
  fields = fields || [];
  return fields.reduce((memo, field) => {
    return assign(memo, field.validate(value));
  }, {});
});



const any = init(value => value);

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
}
