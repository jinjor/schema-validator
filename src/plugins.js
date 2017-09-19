const common = require('./common.js');
const SchemaValidationError = common.SchemaValidationError;
const reject = common.reject;

// utility
const isUndefined = a => typeof a === 'undefined';

const Combinators = {
  check(checker) {
    if (!checker.condition) {
      throw new Error('checker must contain "condition"');
    }
    return this.last(checker);
  },
  block(message, f, defaultValue) {
    return this.first({
      doc: _ => message,
      validate: value => f(value) ? defaultValue : value
    });
  },
};

const checker = (condition, message, isValid) => {
  return {
    condition: condition,
    doc: _ => message,
    validate: value => isValid(value) ? value : reject(message)
  };
};

// contexts plugin
const Contexts = {
  name(name) {
    return this.withContext({
      name: name
    });
  }
};

// basics plugin
const Basics = {
  truthy() {
    const c = checker('is truthy', 'should be truthy', value => value);
    return this.check(c);
  },
  falsy() {
    const c = checker('is falsy', 'should be falsy', value => !value);
    return this.check(c);
  },
  equal(expected) {
    const c = checker(`equals to ${expected}`, `should be equal to ${expected}`, value => expected === value);
    return this.check(c);
  },
  lt(limit) {
    const c = checker(`is less than ${limit}`, `should be less than ${limit}`, value => value < limit);
    return this.check(c);
  },
  gt(limit) {
    const c = checker(`is greater than ${limit}`, `should be greater than ${limit}`, value => value > limit);
    return this.check(c);
  },
  min(limit) {
    const c = checker(`is not less than ${limit}`, `should not be less than ${limit}`, value => value >= limit);
    return this.check(c);
  },
  max(limit) {
    const c = checker(`is not greater than ${limit}`, `should not be greater than ${limit}`, value => value <= limit);
    return this.check(c);
  },
  positive(includingZero) {
    return includingZero ? this.min(0) : this.gt(0);
  },
  negative(includingZero) {
    return includingZero ? this.max(0) : this.lt(0);
  },
  minLength(limit) {
    const c = checker(`length is less than ${limit}`, `length should not be less than ${limit}`, value => value.length >= limit);
    return this.check(c);
  },
  maxLength(limit) {
    const c = checker(`length is not greater than ${limit}`, `length should not be greater than ${limit}`, value => value.length <= limit);
    return this.check(c);
  },
  required() {
    return this.block('is required', value => isUndefined(value), this.reject('is required'));
  },
  default (defaultValue) {
    return this.block('is optional (default: ' + defaultValue + ')', value => isUndefined(value), defaultValue);
  },
};

const Types = {
  typeOf(typeName, an) {
    const a = an ? 'an' : 'a';
    return this.check(checker(`is ${a} ${typeName}`, `should be ${a} ${typeName}`, value => typeof value === typeName));
  },
  instanceOf(constructorFunc, name) {
    const instanceName = name || constructorFunc.name || 'different class';
    return this.check(checker(
      'is instance of ' + instanceName,
      'should be instance of ' + instanceName,
      value => value instanceof constructorFunc
    ));
  },
  boolean() {
    return this.typeOf('boolean');
  },
  number() {
    return this.typeOf('number');
  },
  string() {
    return this.typeOf('string');
  },
  func() {
    return this.typeOf('function');
  },
  object() {
    return this.typeOf('object', true);
  },
  date() {
    return this.instanceOf(Date);
  },
  integer() {
    const c = checker('is an integer', 'should be an integer', value => value % 1 === 0);
    return this.check(c);
  },
  array() {
    const c = checker('is an array', 'should be an array', value => Array.isArray(value));
    return this.check(c);
  },
  arrayLike() {
    const c = checker('is an array-like object', 'should be an array-like object', value => typeof value.length === 'number');
    return this.check(c);
  },
}


// structures plugin
const Structures = {
  items(itemSchema) {
    return this.last({
      doc: indent => 'each item:\n' + itemSchema.doc(indent + '  '),
      validate: value => {
        return value.map((item, index) => {
          const name = `${this.context.name}[${index}]`;
          return itemSchema.name(name).validate(item);
        });
      }
    });
  },
  key(key) {
    return this.last({
      doc: indent => 'should have key ' + key,
      validate: value => value[key]
    });
  },
  field(key, valueSchema, checker) {
    if (!valueSchema) {
      throw new Error(`key ${key}'s value schema is undefined`);
    }
    const parentName = this.context.name;
    return this.last({
      doc: indent => `field ${key}:\n` + valueSchema.doc(indent + '  '),
      validate: value => {
        if (checker && !checker.validate(value)) {
          valueSchema = valueSchema.required();
        }
        const v = value[key];
        return Object.assign({}, value, {
          [key]: valueSchema.name(`${parentName}.${key}`).validate(v)
        });
      }
    });
  }
};

// TODO: possible APIs
// mail, uri, alphanum, regex, guid, hex, uppercase, lowercase
// replace, trim

module.exports = [Combinators, Contexts, Basics, Types, Structures];
