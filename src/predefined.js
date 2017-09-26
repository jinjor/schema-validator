function isUndefined(a) {
  return typeof a === 'undefined';
}

module.exports = function(original) {
  const sv = original.extend({
    // Satisfaction
    is(message, isValid) {
      return this._satisfy('should be ' + message, isValid);
    },
    isnt(message, isValid) {
      return this._satisfy('should not be ' + message, isValid);
    },
    // Comparison
    truthy() {
      return this.is('truthy', value => value);
    },
    falsy() {
      return this.is('falsy', value => !value);
    },
    equal(expected) {
      return this.is(`equal to ${expected}`, value => expected === value);
    },
    lt(limit) {
      return this.is(`less than ${limit}`, value => value < limit);
    },
    gt(limit) {
      return this.is(`greater than ${limit}`, value => value > limit);
    },
    min(limit) {
      return this.isnt(`less than ${limit}`, value => value >= limit);
    },
    max(limit) {
      return this.isnt(`greater than ${limit}`, value => value <= limit);
    },
    // Requisitions
    required() {
      return this.first(value => isUndefined(value) ? sv.reject('is required') : value);
    },
    default_(defaultValue) {
      return this.first(value => isUndefined(value) ? sv.break_(defaultValue) : value);
    },
    // Types
    typeOf(typeName) {
      const a = /[aeiou]/.test(typeName.charAt(0)) ? 'an' : 'a';
      return this.is(`${a} ${typeName}`, value => typeof value === typeName);
    },
    instanceOf(cls) {
      return this.is(`instance of ${cls.name}`, value => value instanceof constructorFunc);
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
      return this.is(`an object`, value => typeof value === 'object' && value !== null);
    },
    date() {
      return this.instanceOf(Date);
    },
    integer() {
      return this.is(`an integer`, value => value % 1 === 0);
    },
    array() {
      return this.is(`an array`, value => Array.isArray(value));
    },
    arrayLike() {
      return this.is(`an array-like object`, value => typeof value.length === 'number');
    },
    defined() {
      return this.is(`defined`, value => !isUndefined(value));
    },
    // Array(-like)
    minLength(limit) {
      return this.then(v => this.key('length', sv.min(limit)).then(_ => v));
    },
    maxLength(limit) {
      return this.then(v => this.key('length', sv.max(limit)).then(_ => v));
    },
    // Object
    keyValue(key, valueSchema) {
      return this.key(key, valueSchema).then(v => {
        return {
          [key]: v
        };
      });
    },
    field(key, valueSchema, checkerSchema) {
      const keyValueSchema = this.keyValue(key, valueSchema);
      const toMergeSchema = value => {
        return keyValueSchema.then(keyValue => {
          return Object.assign({}, value, keyValue);
        });
      };
      if (checkerSchema) {
        return this.when(checkerSchema, sv.then(toMergeSchema));
      }
      return this.then(toMergeSchema);
    }
  });
  return sv;
}
