module.exports = function(original) {
  const sv = original.extend({
    // Satisfaction
    is(message, isValid) {
      return this.next(sv.satisfy(isValid, 'should be ' + message));
    },
    isnt(message, isValid) {
      return this.next(sv.satisfy(isValid, 'should not be ' + message));
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
      return this.is(`defined`, value => typeof value !== 'undefined');
    },
    // Requisitions
    required() {
      return sv._when(sv.typeOf('undefined'), sv.reject('is required')).next(this);
    },
    default_(defaultValue) {
      return sv._when(sv.typeOf('undefined'), sv.break_(defaultValue)).next(this);
    },
    // Array(-like)
    minLength(limit) {
      return this.check(sv.key('length').min(limit));
    },
    maxLength(limit) {
      return this.check(sv.key('length').max(limit));
    },
    field(key, valueSchema, checkerSchema) {
      if (checkerSchema) {
        return this.when(checkerSchema, sv.field(key, valueSchema));
      }
      return this.then(value => {
        return sv.key(key, valueSchema).then(v => {
          return Object.assign({}, value, {
            [key]: v
          });
        })
      });
    }
  });
  return sv;
}
