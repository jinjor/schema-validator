function isUndefined(a) {
  return typeof a === 'undefined';
}

module.exports = {
  // helper
  shouldBe(message, isValid) {
    return this.then(value => isValid(value) ? value : this.reject('should be ' + message));
  },
  shouldNotBe(message, isValid) {
    return this.then(value => isValid(value) ? value : this.reject('should not be ' + message));
  },
  // Comparison
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
    return this.shouldBe(`${a} ${typeName}`, value => typeof value === typeName);
  },
  instanceOf(cls) {
    return this.shouldBe(`instance of ${cls.name}`, value => value instanceof constructorFunc);
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
    return this.shouldBe(`an object`, value => typeof value === 'object' && value !== null);
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
  },
  // Structures
  items(itemSchema) {
    return this.then(value => {
      return this._validateAll(value, (item, i) => {
        const name = `${this.context.name}[${i}]`;
        return itemSchema.name(name);
      });
    });
  },
  key(key) {
    return this.empty().then(value => value[key]).name(`${this.context.name}.${key}`);
  },
  keyValue(key, valueSchema) {
    return this.key(key).then(_ => valueSchema).then(v => {
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
    return this.check(_ => this.key('length').min(limit));
  },
  maxLength(limit) {
    return this.check(_ => this.key('length').max(limit));
  },
  arity(n) {
    return this.check(_ => this.key('length').name('arity of ' + this.context.name).equal(n));
  },
  minArity(limit) {
    return this.check(_ => this.key('length').name('arity of ' + this.context.name).min(limit));
  },
  maxArity(limit) {
    return this.check(_ => this.key('length').name('arity of ' + this.context.name).max(limit));
  }
};
