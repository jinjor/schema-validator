// utility
const isUndefined = a => typeof a === 'undefined';

// basics plugin
const basics = {
  equal: schema => expect => schema.check(value => {
    if (expect !== value) {
      return 'should be equal to ' + expected;
    }
  }),
  lt: schema => limit => schema.check(value => {
    if (value >= limit) {
      return 'should be less than ' + limit;
    }
  }),
  gt: schema => limit => schema.check(value => {
    if (value <= limit) {
      return 'should be greater than ' + limit;
    }
  }),
  min: schema => limit => schema.check(value => {
    if (value < limit) {
      return 'should not be less than ' + limit;
    }
  }),
  max: schema => limit => schema.check(value => {
    if (value > limit) {
      return 'should not be greater than ' + limit;
    }
  }),
  required: schema => _ => schema.init(value => {
    return !isUndefined(value) ? schema.validate(value) : schema.reject('is required');
  }),
  default: schema => defaultValue => schema.init(value => {
    return !isUndefined(value) ? schema.validate(value) : defaultValue
  }),
};

// types plugin
const types = {
  typeOf: schema => typeName => schema.check(value => {
    if (typeof value !== typeName) {
      return 'should be a ' + typeName;
    }
  }),
  boolean: schema => _ => schema.next(schema.typeOf('boolean')),
  number: schema => _ => schema.typeOf('number'),
  string: schema => _ => schema.typeOf('string'),
  func: schema => _ => schema.typeOf('function'),
  object: schema => _ => schema.typeOf('object'),
  integer: schema => _ => schema.check(value => {
    if (value % 1 !== 0) {
      return 'should be an integer';
    }
  }),
  array: schema => _ => schema.check(value => {
    if (isUndefined(value.length)) {
      return 'should be an array';
    }
  }),
};

// structures plugin
const structures = {
  items: schema => itemSchema => schema.then(value => {
    return value.map(item => {
      return itemSchema.validate(item);
    });
  }),
  field: schema => (key, valueSchema, requiredIf) => schema.then(value => {
    if (requiredIf && !requiredIf(value)) {
      valueSchema = valueSchema.required();
    }
    const v = value[key];
    return Object.assign({}, value, {
      [key]: valueSchema.validate(v)
    });
  })
};

module.exports = [basics, types, structures];
