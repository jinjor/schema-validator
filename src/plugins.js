const breakable = require('./breakable.js');
const Reject = breakable.Reject;
const reject = breakable.reject;

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
  block(message, f, whenMatched) {
    return this.first({
      doc: _ => message,
      _validate: value => f(value) ? whenMatched(value) : value
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
    _validate: value => isValid(value) ? value : new Reject(message)
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
    if (isUndefined(isRequired) ? true : isRequired) {
      return this.block(
        'is required',
        value => isUndefined(value),
        _ => this.reject('is required')
      );
    } else {
      return this.block(
        '',
        value => true,
        value => this._break(value)
      );
    }
  },
  optional() {
    return this.required(false);
  },
  default (defaultValue) {
    return this.block(
      'is optional (default: ' + defaultValue + ')',
      value => isUndefined(value),
      _ => this._break(defaultValue)
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
  defined() {
    return this.shouldBe(`defined`, value => !isUndefined(value));
  }
}

function groupDoc(header, childSchema) {
  return indent => header + ':\n' + childSchema.doc(indent + '  ');
}

const Structures = {
  items(itemSchema) {
    return this.last({
      doc: groupDoc('each item', itemSchema),
      _validate: value => {
        const newArray = [];
        for (let i = 0; i < value.length; i++) {
          const item = value[i];
          const name = `${this.context.name}[${i}]`;
          const result = itemSchema.name(name)._validate(item);
          if (result instanceof Reject) {
            return result;
          }
          newArray.push(result);
        }
        return newArray;
      }
    });
  },
  key(key) {
    return this.init().then(value => value[key]).name(`${this.context.name}.${key}`);
  },
  when(checkerSchema, thenSchema) {
    return this.last({
      doc: groupDoc('when ...'),
      _validate: value => {
        const isValid = checkerSchema.isValid(value);
        if (!isValid) {
          return value;
        }
        return thenSchema.validate(value);
      }
    });
  },
  field(key, valueSchema, checkerSchema) {
    if (checkerSchema) {
      return this.when(checkerSchema, this.init().field(key, valueSchema));
    }
    const parentName = this.context.name;
    return this.then(value => {
      const result = valueSchema.name(`${parentName}.${key}`)._validate(value[key]);
      if (result instanceof Reject) {
        return result;
      }
      return Object.assign({}, value, {
        [key]: result
      });
    });
  },
  checkCondition(schema) {
    return this.then(value => {
      const result = schema._validate(value);
      if (result instanceof Reject) {
        return result;
      }
      return value;
    });
  },
  minLength(limit) {
    return this.checkCondition(this.key('length').integer().min(limit));
  },
  maxLength(limit) {
    return this.checkCondition(this.key('length').integer().max(limit));
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
