const common = require('./common.js');
const SchemaValidationError = common.SchemaValidationError;
const reject = common.reject;

// utility
const isUndefined = a => typeof a === 'undefined';

const Combinators = {
  check(checker) {
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
    return this.check(checker('is truthy', 'should be truthy', value => value));
  },
  falsy() {
    return this.check(checker('is falsy', 'should be falsy', value => !value));
  },
  equal(expected) {
    return this.check(checker('equals to ' + expected, 'should be equal to ' + expected, value => expected === value));
  },
  lt(limit) {
    return this.check(checker('is less than ' + limit, 'should be less than ' + limit, value => value < limit));
  },
  gt(limit) {
    return this.check(checker('is greater than ' + limit, 'should be greater than ' + limit, value => value > limit));
  },
  min(limit) {
    return this.check(checker('is not less than ' + limit, 'should not be less than ' + limit, value => value >= limit));
  },
  max(limit) {
    return this.check(checker('is not greater than ' + limit, 'should not be greater than ' + limit, value => value <= limit));
  },
  positive(includingZero) {
    return includingZero ? this.min(0) : this.gt(0);
  },
  negative(includingZero) {
    return includingZero ? this.max(0) : this.lt(0);
  },
  minLength(limit) {
    return this.check(checker('length is less than ' + limit, 'length should not be less than ' + limit, value => value.length >= limit));
  },
  maxLength(limit) {
    return this.check(checker('length is not greater than ' + limit, 'length should not be greater than ' + limit, value => value.length <= limit));
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
    return this.check(checker('is an integer', 'should be an integer', value => value % 1 === 0));
  },
  array() {
    return this.check(checker('is an array', 'should be an array', value => Array.isArray(value)));
  },
  arrayLike() {
    return this.check(checker('is an array-like object', 'should be an array-like object', value => typeof value.length === 'number'));
  },
}


// structures plugin
const Structures = {
  items(itemSchema) {
    return this.last({
      doc: indent => 'each item:\n' + itemSchema.doc(indent + '  '),
      validate: value => {
        return value.map((item, index) => {
          const name = this.context.name + '[' + index + ']';
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
      doc: indent => 'field ' + key + ':\n' + valueSchema.doc(indent + '  '),
      validate: value => {
        if (checker && !checker.validate(value)) {
          valueSchema = valueSchema.required();
        }
        const v = value[key];
        return Object.assign({}, value, {
          [key]: valueSchema.name(parentName + '.' + key).validate(v)
        });
      }
    });
  }
};

// TODO: possible APIs
// mail, uri, alphanum, regex, guid, hex, uppercase, lowercase
// replace, trim

module.exports = [Combinators, Contexts, Basics, Types, Structures];
