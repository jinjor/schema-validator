// utility
const isUndefined = a => typeof a === 'undefined';

// contexts plugin
const contexts = {
  name: schema => name => schema.withContext({
    name: name
  })
};

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
  positive: schema => includingZero => {
    return includingZero ? schema.min(0) : schema.gt(0);
  },
  negative: schema => includingZero => {
    return includingZero ? schema.max(0) : schema.lt(0);
  },
  minLength: schema => limit => schema.check(value => {
    if (value.length < limit) {
      return '.length should not be less than ' + limit;
    }
  }),
  maxLength: schema => limit => schema.check(value => {
    if (value.length > limit) {
      return '.length should not be greater than ' + limit;
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
      return 'should be type of ' + typeName;
    }
  }),
  instanceOf: schema => (constructorFunc, name) => schema.check(value => {
    if (!(value instanceof constructorFunc)) {
      name = name || constructorFunc.name || 'different class';
      return 'should be instance of ' + name;
    }
  }),
  boolean: schema => _ => schema.next(schema.typeOf('boolean')),
  number: schema => _ => schema.typeOf('number'),
  string: schema => _ => schema.typeOf('string'),
  func: schema => _ => schema.typeOf('function'),
  object: schema => _ => schema.typeOf('object'),
  date: schema => _ => schema.instanceOf(Date),
  integer: schema => _ => schema.check(value => {
    if (value % 1 !== 0) {
      return 'should be an integer';
    }
  }),
  array: schema => _ => schema.check(value => {
    if (isUndefined(value.length)) {
      return 'should be an array';
    }
  })
};

// structures plugin
const structures = {
  items: schema => itemSchema => schema.then(value => {
    return value.map((item, index) => {
      return itemSchema.name(schema.context.name + '[' + index + ']').validate(item);
    });
  }),
  field: schema => (key, valueSchema, requiredIf) => schema.then(value => {
    if (requiredIf && !requiredIf(value)) {
      valueSchema = valueSchema.required();
    }
    const v = value[key];
    return Object.assign({}, value, {
      [key]: valueSchema.name(schema.context.name + '.' + key).validate(v)
    });
  })
};

// TODO: possible APIs
// mail, uri, alphanum, regex, guid, hex, uppercase, lowercase
// replace, trim

module.exports = [contexts, basics, types, structures];
