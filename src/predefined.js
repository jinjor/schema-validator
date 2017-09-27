module.exports = function(original) {
  const S = {
    is: (message, isValid) => Schema.satisfy(isValid, 'should be ' + message),
    isnt: (message, isValid) => Schema.satisfy(isValid, 'should not be ' + message),
    truthy: () => S.is('truthy', value => value),
    falsy: () => S.is('falsy', value => !value),
    equal: (expected) => S.is(`equal to ${expected}`, value => expected === value),
    lt: (limit) => S.is(`less than ${limit}`, value => value < limit),
    gt: (limit) => S.is(`greater than ${limit}`, value => value > limit),
    min: (limit) => S.isnt(`less than ${limit}`, value => value >= limit),
    max: (limit) => S.isnt(`greater than ${limit}`, value => value <= limit),
    typeOf: (typeName) => {
      const a = /[aeiou]/.test(typeName.charAt(0)) ? 'an' : 'a';
      return S.is(`${a} ${typeName}`, value => typeof value === typeName);
    },
    instanceOf: (cls) => {
      return S.is(`instance of ${cls.name}`, value => value instanceof cls);
    },
    boolean: () => S.typeOf('boolean'),
    number: () => S.typeOf('number'),
    string: () => S.typeOf('string'),
    func: () => S.typeOf('function'),
    object: () => Schema.check(S.typeOf('object').isnt('null', value => value !== null)),
    date: () => S.instanceOf(Date),
    integer: () => S.is(`an integer`, value => value % 1 === 0),
    array: () => S.is(`an array`, value => Array.isArray(value)),
    arrayLike: () => Schema.check(Schema.key('length').typeOf('number')),
    keyValue: (key, valueSchema) => {
      return Schema.key(key, valueSchema).then(v => {
        return {
          [key]: v
        };
      });
    },
    assign: (objectSchema) => {
      return Schema.func(value => {
        return objectSchema.then(object => {
          return Object.assign({}, value, object);
        })
      });
    }
  };
  const advanced = {
    required() {
      return Schema.when(S.typeOf('undefined'), Schema.reject('is required'), this);
    },
    default_(defaultValue) {
      return Schema.when(S.typeOf('undefined'), Schema.value(defaultValue), this);
    },
    // Array(-like)
    minLength(limit) {
      return this.check(Schema.key('length', S.min(limit)));
    },
    maxLength(limit) {
      return this.check(Schema.key('length', S.max(limit)));
    },
    field(key, valueSchema, checkerSchema) {
      if (checkerSchema) {
        return Schema.when(checkerSchema, this.field(key, valueSchema));
      }
      return this.next(S.assign(S.keyValue(key, valueSchema)));
    }
  };
  const simple = Object.keys(S).reduce((memo, key) => {
    const f = S[key];
    memo[key] = function() {
      return this.next(f.apply(this, arguments));
    };
    return memo;
  }, {});
  const methods = Object.assign(simple, advanced);
  const Schema = original.extend(methods);
  return Schema;
}
