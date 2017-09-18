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
  equal: schema => expect => schema.check(value => expect === value, 'should be equal to ' + expected),
  lt: schema => limit => schema.check(value => value < limit, 'should be less than ' + limit),
  gt: schema => limit => schema.check(value => value > limit, 'should be greater than ' + limit),
  min: schema => limit => schema.check(value => value >= limit, 'should not be less than ' + limit),
  max: schema => limit => schema.check(value => value <= limit, 'should not be greater than ' + limit),
  positive: schema => includingZero => includingZero ? schema.min(0) : schema.gt(0),
  negative: schema => includingZero => includingZero ? schema.max(0) : schema.lt(0),
  minLength: schema => limit => schema.check(value => value.length >= limit, '.length should not be less than ' + limit),
  maxLength: schema => limit => schema.check(value => value.length <= limit, '.length should not be greater than ' + limit),
  required: schema => _ => schema.init(value => {
    return !isUndefined(value) ? schema.validate(value) : schema.reject('is required');
  }),
  default: schema => defaultValue => schema.init(value => {
    return !isUndefined(value) ? schema.validate(value) : defaultValue
  }),
};

// types plugin
const types = {
  typeOf: schema => typeName => schema.check(value => typeof value === typeName, 'should be type of ' + typeName),
  instanceOf: schema => (constructorFunc, name) => schema.check(
    value => value instanceof constructorFunc,
    'should be instance of ' + (name || constructorFunc.name || 'different class')
  ),
  boolean: schema => _ => schema.next(schema.typeOf('boolean')),
  number: schema => _ => schema.typeOf('number'),
  string: schema => _ => schema.typeOf('string'),
  func: schema => _ => schema.typeOf('function'),
  object: schema => _ => schema.typeOf('object'),
  date: schema => _ => schema.instanceOf(Date),
  integer: schema => _ => schema.check(value => value % 1 === 0, 'should be an integer'),
  array: schema => _ => schema.check(value => Array.isArray(value), 'should be an array'),
  arrayLike: schema => _ => schema.check(value => typeof value.length === 'number', 'should be an array-like object'),
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
