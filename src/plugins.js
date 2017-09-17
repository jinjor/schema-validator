// utility
const assign = (obj, overrides) => Object.assign({}, obj, overrides);
const isUndefined = a => typeof a === 'undefined';

// basics plugin
const basics = {
  equal: schema => expect => schema.then(value => (expect === value) ? value : new Error(value + ' should be equal to ' + expected)),
  lt: schema => limit => schema.then(value => (value < limit) ? value : new Error(value + ' should be less than ' + limit)),
  gt: schema => limit => schema.then(value => (value > limit) ? value : new Error(value + ' should be greater than ' + limit)),
  min: schema => limit => schema.then(value => (value >= limit) ? value : new Error(value + ' should not be less than ' + limit)),
  max: schema => limit => schema.then(value => (value <= limit) ? value : new Error(value + ' should not be greater than ' + limit)),
  required: schema => _ => schema.init(value => !isUndefined(value) ? schema.validate(value) : new Error(value + ' is required')),
  default: schema => defaultValue => schema.init(value => !isUndefined(value) ? schema.validate(value) : defaultValue),
};

// types plugin
const checkType = (typeName, value) => {
  return (typeof value === typeName) ? value : new Error(value + ' is not a ' + typeName)
}
const types = {
  typeOf: schema => typeName => schema.then(value => checkType(typeName, value)),
  boolean: schema => _ => schema.then(value => checkType('boolean', value)),
  number: schema => _ => schema.then(value => checkType('number', value)),
  string: schema => _ => schema.then(value => checkType('string', value)),
  func: schema => _ => schema.then(value => checkType('function', value)),
};

// structures plugin
const structures = {
  array: schema => itemSchema => schema.then(value => {
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
  object: schema => schemaGenerators => schema.then(value => {
    return (schemaGenerators || []).reduce((memo, toSchema) => {
      return assign(memo, toSchema(memo).validate(value));
    }, {});
  }),
  field: schema => (key, valueSchema) => schema.then(value => {
    const v = value[key];
    return {
      [key]: valueSchema.validate(v)
    };
  }),
};

module.exports = [basics, types, structures];
