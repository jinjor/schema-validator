// utility
const assign = obj => overrides => Object.assign({}, obj, overrides);

// schema object
function init(_validate) {
  const schema = {};
  schema._validate = _validate;
  schema.map = map(schema);
  schema.then = then(schema);
  schema.validate = validate(schema);
  return schema;
}

// conversion
const map = schema => f => assign(schema, {
  _validate: context => value => f(schema.value)
});
const then = schema => f => init(context => value => {
  const newValue = schema._validate(value);
  if (newValue instanceof Error) {
    return newValue;
  }
  return f(context)(newValue);
})

// primitives
const typeOf = typeName => init(context => value => {
  if (typeof value === typeName) {
    return value;
  } else {
    return new Error(value + ' is not a ' + typeName);
  }
});

// validate
const initialContext = {};
const validate = schema => value => {
  var newValue = schema._validate(initialContext)(value)
  if (newValue instanceof Error) {
    throw newValue;
  }
  return newValue;
};

// types
const boolean = typeOf('boolean');
const number = typeOf('number');
const string = typeOf('string');
const func = typeOf('function');
const object = typeOf('object');
const any = typeOf('any', context => value => true);

module.exports = {
  boolean: boolean,
  number: number,
  string: string,
  func: func,
  object: object,
  any: any
};
