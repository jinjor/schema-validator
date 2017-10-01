schema-validator
====

[![Build Status](https://travis-ci.org/jinjor/schema-validator.svg)](https://travis-ci.org/jinjor/schema-validator)

**Note**:
  Worked hard but finally gave up for some reasons. Also, the following doc is outdated.


Extensible Assertion + Transformation for function arguments. Highly inspired by [joi](https://github.com/hapijs/joi).


## Usage

```javascript
const SV = require('schema-validator.js');
const sv = SV({
  allowedMethod(methods) {
    return this.is(`one of ${methods}`, value => methods.includes(value));
  }
});

const schema = sv.object()
  .field('host', sv.string().required())
  .field('method', sv.allowedMethod(['GET', 'POST']).default_('GET'))
  .field('path', sv.string().default_('/'))
  .field('timeout', sv.integer().min(0).default_(20 * 1000));

function myFunction(options) {
  schema.validate(options, 'options');
}

myFunction({
  host: 'example.com',
  method: 'DELETE',
  timeout: 10 * 1000
});// => Error: options.method should be one of GET,POST, but got "DELETE"
```

### Basic

* empty()
* reject(message)
* break_(value)
* first(f)
* then(f)
* when(checkerSchema, thenSchema, elseSchema)
* check(checkerSchema)
* try_(trySchema, catchSchema)
* validate(value, name)
* key(key, valueSchema)
* flatten(toKeySchemas)

### Validation

* is(message, isValid)
* isnt(message, isValid)
* truthy()
* falsy()
* equal(expected)
* lt(limit)
* gt(limit)
* min(limit)
* max(limit)
* required()
* default_(defaultValue)
* typeOf(typeName)
* instanceOf(class)
* boolean()
* number()
* string()
* func()
* object()
* date()
* integer()
* array()
* arrayLike()
* defined()
* minLength(limit)
* maxLength(limit)
* items(itemSchema)
* keyValue(key, valueSchema)
* field(key, valueSchema, checkerSchema)

## LICENSE

MIT
