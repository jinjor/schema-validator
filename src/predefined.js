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
  default (defaultValue) {
    return this.first(value => isUndefined(value) ? this.break(defaultValue) : value);
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
    return this.typeOf('object');
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
    return this.init().then(value => value[key]).name(`${this.context.name}.${key}`);
  },
  when(checkerSchema, thenSchema, elseSchema) {
    return this.then(value => {
      const isValid = checkerSchema.isValid(value);
      if (isValid) {
        return thenSchema;
      }
      if (elseSchema) {
        return elseSchema;
      }
      return value;
    });
  },
  field(key, valueSchema, checkerSchema) {
    const objectSchema = this.key(key).then(_ => valueSchema).then(v => {
      return {
        [key]: v
      };
    });
    const toMergeSchema = value => {
      return objectSchema.then(v => {
        return Object.assign({}, value, v);
      });
    };
    if (checkerSchema) {
      return this.when(checkerSchema, this.init().then(toMergeSchema));
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
