// utility
const isUndefined = a => typeof a === 'undefined';

const Combinators = {
  next(nextSchema) {
    return this.then(value => {
      return nextSchema.validate(value);
    });
  },
  check(f, message) {
    return this.then(value => {
      return f(value) ? value : this.reject(message);
    });
  }
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
  equal(expect) {
    return this.check(value => expect === value, 'should be equal to ' + expected);
  },
  lt(limit) {
    return this.check(value => value < limit, 'should be less than ' + limit);
  },
  gt(limit) {
    return this.check(value => value > limit, 'should be greater than ' + limit);
  },
  min(limit) {
    return this.check(value => value >= limit, 'should not be less than ' + limit);
  },
  max(limit) {
    return this.check(value => value <= limit, 'should not be greater than ' + limit);
  },
  positive(includingZero) {
    return includingZero ? this.min(0) : this.gt(0);
  },
  negative(includingZero) {
    return includingZero ? this.max(0) : this.lt(0);
  },
  minLength(limit) {
    return this.check(value => value.length >= limit, '.length should not be less than ' + limit);
  },
  maxLength(limit) {
    return this.check(value => value.length <= limit, '.length should not be greater than ' + limit);
  },
  required() {
    return this.init(value => {
      return !isUndefined(value) ? this.validate(value) : this.reject('is required');
    });
  },
  default (defaultValue) {
    return this.init(value => {
      return !isUndefined(value) ? this.validate(value) : defaultValue
    });
  },
};

const Types = {
  typeOf(typeName) {
    return this.check(value => typeof value === typeName, 'should be type of ' + typeName)
  },
  instanceOf(constructorFunc, name) {
    return this.check(
      value => value instanceof constructorFunc,
      'should be instance of ' + (name || constructorFunc.name || 'different class')
    );
  },
  boolean() {
    return this.next(this.typeOf('boolean'));
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
    return this.typeOf('object');
  },
  date() {
    return this.instanceOf(Date);
  },
  integer() {
    return this.check(value => value % 1 === 0, 'should be an integer');
  },
  array() {
    return this.check(value => Array.isArray(value), 'should be an array');
  },
  arrayLike() {
    return this.check(value => typeof value.length === 'number', 'should be an array-like object');
  },
}


// structures plugin
const Structures = {
  items(itemSchema) {
    return this.then(value => {
      return value.map((item, index) => {
        return itemSchema.name(this.context.name + '[' + index + ']').validate(item);
      });
    });
  },
  field(key, valueSchema, requiredIf) {
    return this.then(value => {
      if (requiredIf && !requiredIf(value)) {
        valueSchema = valueSchema.required();
      }
      const v = value[key];
      return Object.assign({}, value, {
        [key]: valueSchema.name(this.context.name + '.' + key).validate(v)
      });
    });
  }
};

// TODO: possible APIs
// mail, uri, alphanum, regex, guid, hex, uppercase, lowercase
// replace, trim

module.exports = [Combinators, Contexts, Basics, Types, Structures];
