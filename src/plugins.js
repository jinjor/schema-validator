// utility
const assign = (obj, overrides) => Object.assign({}, obj, overrides);
const isUndefined = a => typeof a === 'undefined';

// basics plugin
const basics = {
  equal: schema => expect => schema.check(value => {
    if (expect !== value) {
      return value + ' should be equal to ' + expected;
    }
  }),
  lt: schema => limit => schema.check(value => {
    if (value >= limit) {
      return value + ' should be less than ' + limit;
    }
  }),
  gt: schema => limit => schema.check(value => {
    if (value <= limit) {
      return value + ' should be greater than ' + limit;
    }
  }),
  min: schema => limit => schema.check(value => {
    if (value < limit) {
      return value + ' should not be less than ' + limit;
    }
  }),
  max: schema => limit => schema.check(value => {
    if (value > limit) {
      return value + ' should not be greater than ' + limit;
    }
  }),
  required: schema => _ => schema.init(value => {
    return !isUndefined(value) ? schema.validate(value) : new Error(value + ' is required')
  }),
  default: schema => defaultValue => schema.init(value => {
    return !isUndefined(value) ? schema.validate(value) : defaultValue
  }),
};

// types plugin
const types = {
  typeOf: schema => typeName => schema.check(value => {
    if (typeof value !== typeName) {
      return value + ' is not a ' + typeName;
    }
  }),
  boolean: schema => _ => schema.next(schema.typeOf('boolean')),
  number: schema => _ => schema.next(schema.typeOf('number')),
  string: schema => _ => schema.next(schema.typeOf('string')),
  func: schema => _ => schema.next(schema.typeOf('function')),
};

// structures plugin
const structures = {
  array: schema => itemSchema => schema.next(schema.typeOf('object')).check(value => {
    if (isUndefined(value.length)) {
      return value + ' is not an array';
    }
  }),
  items: schema => itemSchema => schema.then(value => {
    return value.map(item => {
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
