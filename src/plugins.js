const common = require('./common.js');
const SchemaValidationError = common.SchemaValidationError;
const reject = common.reject;

function isUndefined(a) {
  return typeof a === 'undefined';
}

const Combinators = {
  check(checker) {
    if (!checker.condition) {
      throw new Error('checker must contain "condition"');
    }
    return this.last(checker);
  },
  shouldBe(message, isValid) {
    const c = checker('is ' + message, 'should be ' + message, isValid);
    return this.check(c);
  },
  shouldNotBe(message, isValid) {
    const c = checker('is not ' + message, 'should not be ' + message, isValid);
    return this.check(c);
  },
  block(message, f, defaultValue) {
    return this.first({
      doc: _ => message,
      validate: value => f(value) ? defaultValue : value
    });
  },
};

const Contexts = {
  name(name) {
    return this.withContext({
      name: name
    });
  }
};

const checker = (condition, message, isValid) => {
  return {
    condition: condition,
    doc: _ => message,
    validate: value => isValid(value) ? value : reject(message)
  };
};

const Conditions = {
  truthy() {
    return this.shouldBe('truthy', value => value);
  },
  falsy() {
    return this.shouldBe('falsy', value => !value);
  },
  equal(expected) {
    return this.shouldBe(`equal to ${expected}`, value => expected === value);
  },
  lt(limit) {
    return this.shouldBe(`less than ${limit}`, value => value < limit);
  },
  gt(limit) {
    return this.shouldBe(`greater than ${limit}`, value => value > limit);
  },
  min(limit) {
    return this.shouldNotBe(`less than ${limit}`, value => value >= limit);
  },
  max(limit) {
    return this.shouldNotBe(`greater than ${limit}`, value => value <= limit);
  },
  positive(includingZero) {
    return includingZero ? this.min(0) : this.gt(0);
  },
  negative(includingZero) {
    return includingZero ? this.max(0) : this.lt(0);
  },
};

const Requisitions = {
  required(isRequired) {
    if (isUndefined(isRequired) || isRequired) {
      return this.block(
        'is required',
        value => isUndefined(value),
        this.reject('is required')
      );
    } else {
      return this;
    }
  },
  default (defaultValue) {
    return this.block(
      'is optional (default: ' + defaultValue + ')',
      value => isUndefined(value),
      defaultValue
    );
  },
};

const Types = {
  typeOf(typeName, an) {
    const a = an ? 'an' : 'a';
    return this.shouldBe(`${a} ${typeName}`, value => typeof value === typeName);
  },
  instanceOf(constructorFunc, name) {
    const instanceName = name || constructorFunc.name || 'different class';
    return this.shouldBe(`instance of ${instanceName}`, value => value instanceof constructorFunc);
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
    return this.shouldBe(`an integer`, value => value % 1 === 0);
  },
  array() {
    return this.shouldBe(`an array`, value => Array.isArray(value));
  },
  arrayLike() {
    return this.shouldBe(`an array-like object`, value => typeof value.length === 'number');
  },
}

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
    return this.then(value => value[key]);
  },
  field(key, valueSchema, checker) {
    if (!valueSchema) {
      throw new Error(`key ${key}'s value schema is undefined`);
    }
    const parentName = this.context.name;
    return this.last({
      doc: indent => `field ${key}:\n` + valueSchema.doc(indent + '  '),
      validate: value => {
        const isRequired = checker ? !checker.validate(value) : false;
        const v = value[key];
        return Object.assign({}, value, {
          [key]: valueSchema.name(`${parentName}.${key}`).required(isRequired).validate(v)
        });
      }
    });
  },
  checkIf(schema) {
    return this.then(value => {
      schema.validate(value);
      return value;
    });
  },
  checkLength(schema) {
    return this.checkIf(this.init().key('length').name('length of ' + this.context.name).integer().then(len => {
      schema.validate(len);
    }));
  },
  minLength(limit) {
    return this.checkLength(this.init().min(limit));
  },
  maxLength(limit) {
    return this.checkLength(this.init().max(limit));
  }
};

// TODO: possible APIs
// mail, uri, alphanum, regex, guid, hex, uppercase, lowercase
// replace, trim

module.exports = [
  Combinators,
  Contexts,
  Conditions,
  Requisitions,
  Types,
  Structures
];
