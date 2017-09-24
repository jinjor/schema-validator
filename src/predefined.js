function isUndefined(a) {
  return typeof a === 'undefined';
}

module.exports = {
  // helper
  is(message, isValid) {
    return this.then(value => isValid(value) ? value : this.reject('should be ' + message));
  },
  isnt(message, isValid) {
    return this.then(value => isValid(value) ? value : this.reject('should not be ' + message));
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
    return this.first(value => isUndefined(value) ? this.reject('is required') : value);
  },
  default_(defaultValue) {
    return this.first(value => isUndefined(value) ? this.break_(defaultValue) : value);
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
  // Structures
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
      return this.when(checkerSchema, this.empty().then(toMergeSchema));
    }
    return this.then(toMergeSchema);
  },
  minLength(limit) {
    return this.check(this.key('length', this.empty().min(limit)));
  },
  maxLength(limit) {
    return this.check(this.key('length', this.empty().max(limit)))
  }
};
