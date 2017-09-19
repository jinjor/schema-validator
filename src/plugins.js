// utility
const isUndefined = a => typeof a === 'undefined';

const Combinators = {
  check(message, f) {
    return this.last({
      doc: _ => message,
      validate: value => f(value) ? value : reject(message),
    });
  },
  block(message, f, defaultValue) {
    return this.first({
      doc: _ => message,
      validate: value => f(value) ? defaultValue : value,
      defaultValue: defaultValue
    });
  },
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
    return this.check('should be equal to ' + expected, value => expect === value);
  },
  lt(limit) {
    return this.check('should be less than ' + limit, value => value < limit);
  },
  gt(limit) {
    return this.check('should be greater than ' + limit, value => value > limit);
  },
  min(limit) {
    return this.check('should not be less than ' + limit, value => value >= limit);
  },
  max(limit) {
    return this.check('should not be greater than ' + limit, value => value <= limit);
  },
  positive(includingZero) {
    return includingZero ? this.min(0) : this.gt(0);
  },
  negative(includingZero) {
    return includingZero ? this.max(0) : this.lt(0);
  },
  minLength(limit) {
    return this.check('.length should not be less than ' + limit, value => value.length >= limit);
  },
  maxLength(limit) {
    return this.check('.length should not be greater than ' + limit, value => value.length <= limit);
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
    return this.check(`should be ${a} ${typeName}`, value => typeof value === typeName);
  },
  instanceOf(constructorFunc, name) {
    return this.check(
      'should be instance of ' + (name || constructorFunc.name || 'different class'),
      value => value instanceof constructorFunc
    );
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
    return this.check('should be an integer', value => value % 1 === 0);
  },
  array() {
    return this.check('should be an array', value => Array.isArray(value));
  },
  arrayLike() {
    return this.check('should be an array-like object', value => typeof value.length === 'number');
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
  field(key, valueSchema, requiredIf) {
    return this.last({
      doc: indent => 'field ' + key + ':\n' + valueSchema.doc(indent + '  '),
      validate: value => {
        if (requiredIf && !requiredIf(value)) {
          valueSchema = valueSchema.required();
        }
        const v = value[key];
        return Object.assign({}, value, {
          [key]: valueSchema.name(this.context.name + '.' + key).validate(v)
        });
      }
    });
  }
};

// TODO: possible APIs
// mail, uri, alphanum, regex, guid, hex, uppercase, lowercase
// replace, trim

module.exports = [Combinators, Contexts, Basics, Types, Structures];
