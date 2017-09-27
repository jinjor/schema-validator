module.exports = function(original) {
  // const is = (message, isValid) => Schema.satisfy(isValid, 'should be ' + message);
  // const isnt = (message, isValid) => Schema.satisfy(isValid, 'should not be ' + message);
  // const truthy = () => is('truthy', value => value);
  // const falsy = () => is('falsy', value => !value);
  // const equal = (expected) => is(`equal to ${expected}`, value => expected === value);
  // const lt = (limit) => is(`less than ${limit}`, value => value < limit);
  // const gt = (limit) => is(`greater than ${limit}`, value => value > limit);
  // const min = (limit) => isnt(`less than ${limit}`, value => value >= limit);
  // const max = (limit) => isnt(`greater than ${limit}`, value => value <= limit);
  // const typeOf = (typeName) => {
  //   const a = /[aeiou]/.test(typeName.charAt(0)) ? 'an' : 'a';
  //   return is(`${a} ${typeName}`, value => typeof value === typeName);
  // };
  // const instanceOf = (cls) => {
  //   return is(`instance of ${cls.name}`, value => value instanceof cls);
  // };
  // const boolean = () => typeOf('boolean');
  // const number = () => typeOf('number');
  // const string = () => typeOf('string');
  // const func = () => typeOf('function');
  // const object = () => Schema.check(typeOf('object').isnt('null', value => value !== null));
  // const date = () => instanceOf(Date);
  // const integer = () => is(`an integer`, value => value % 1 === 0);
  // const array = () => is(`an array`, value => Array.isArray(value));
  // const keyValue = (key, valueSchema) => {
  //   return Schema.key(key, valueSchema).then(v => {
  //     return {
  //       [key]: v
  //     };
  //   });
  // }
  // const assign = (objectSchema) => {
  //   return Schema.func(value => {
  //     return objectSchema.then(object => {
  //       return Object.assign({}, value, object);
  //     })
  //   });
  // };
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
  const methods = {
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
  Object.keys(S).forEach(key => {
    const f = S[key];
    methods[key] = function() {
      return this.next(f.apply(this, arguments));
    }
  });
  const Schema = original.extend(methods);

  //
  // const Schema = original.extend({
  //   // Satisfaction
  //   is(message, isValid) {
  //     return this.next(is(message, isValid));
  //   },
  //   isnt(message, isValid) {
  //     return this.next(isnt(message, isValid));
  //   },
  //   // Comparison
  //   truthy() {
  //     return this.next(truthy());
  //   },
  //   falsy() {
  //     return this.next(falsy());
  //   },
  //   equal(expected) {
  //     return this.next(equal(expected));
  //   },
  //   lt(limit) {
  //     return this.next(lt(limit));
  //   },
  //   gt(limit) {
  //     return this.next(gt(limit));
  //   },
  //   min(limit) {
  //     return this.next(min(limit));
  //   },
  //   max(limit) {
  //     return this.next(max(limit));
  //   },
  //   // Types
  //   typeOf(typeName) {
  //     return this.next(typeOf(typeName));
  //   },
  //   instanceOf(cls) {
  //     return this.next(instanceOf(cls));
  //   },
  //   boolean() {
  //     return this.next(boolean());
  //   },
  //   number() {
  //     return this.next(number());
  //   },
  //   string() {
  //     return this.next(string());
  //   },
  //   func() {
  //     return this.next(func());
  //   },
  //   object() {
  //     return this.next(object());
  //   },
  //   date() {
  //     return this.next(date());
  //   },
  //   integer() {
  //     return this.next(integer());
  //   },
  //   array() {
  //     return this.next(array());
  //   },
  //   arrayLike() {
  //     return this.next(Schema.check(Schema.key('length').typeOf('number')));
  //   },
  //   defined() {
  //     return this.next(is(`defined`, value => typeof value !== 'undefined'));
  //   },
  //   // Requisitions
  //   required() {
  //     return Schema.when(typeOf('undefined'), Schema.reject('is required'), this);
  //   },
  //   default_(defaultValue) {
  //     return Schema.when(typeOf('undefined'), Schema.value(defaultValue), this);
  //   },
  //   // Array(-like)
  //   minLength(limit) {
  //     return this.check(Schema.key('length', min(limit)));
  //   },
  //   maxLength(limit) {
  //     return this.check(Schema.key('length', max(limit)));
  //   },
  //   field(key, valueSchema, checkerSchema) {
  //     if (checkerSchema) {
  //       return Schema.when(checkerSchema, this.field(key, valueSchema));
  //     }
  //     return this.next(assign(keyValue(key, valueSchema)));
  //   }
  // });
  return Schema;
}
