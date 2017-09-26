class SchemaValidatorError extends Error {
  constructor(message) {
    super();
    this.message = message;
  }
}

class Reject {
  constructor(message, name, value) {
    this.message = message;
    this.name = name || [];
    this.value = value || [];
  }
  withMoreInfo(name, value) {
    return new Reject(this.message, [name].concat(this.name), this.value.length ? this.value : [value]);
  }
  toError() {
    let name = this.name.filter(n => !!n).join('');
    if (!this.name[0]) {
      name = 'value' + name;
    }
    const stringValue = JSON.stringify(this.value[0]);
    return new SchemaValidatorError(`${name} ${this.message}, but got ${stringValue}`);
  }
}

const createClass = plugins => {
  class Schema {
    static value(value) {
      return new Schema({
        type: 'value',
        $value: value
      });
    }
    static func(f) {
      return new Schema({
        type: 'function',
        $f: f
      });
    }
    static key(key, valueSchema) {
      return new Schema({
        type: 'key',
        $key: key,
        $value: valueSchema || Identity
      })
    }
    static next(first, schema) {
      return new Schema({
        type: 'next',
        $first: first,
        $second: schema,
      });
    }
    static satisfy(isValid, message) {
      return new Schema({
        type: 'satisfy',
        $isValid: isValid,
        $message: message
      });
    }
    static check(checkerSchema) {
      return new Schema({
        type: 'check',
        $check: checkerSchema
      });
    }
    static when(checkerSchema, thenSchema, elseSchema) {
      return new Schema({
        type: 'if',
        $when: checkerSchema,
        $then: thenSchema || Identity,
        $else_: elseSchema || Identity
      });
    }
    static try_(schema, catchSchema) {
      return new Schema({
        type: 'try',
        $try_: schema,
        $catch_: catchSchema
      });
    }
    static items(itemSchema) {
      return new Schema({
        type: 'array',
        $item: itemSchema
      });
    }
    static reject(message) {
      return new Schema({
        type: 'reject',
        $message: message
      });
    }
    static extend(plugin) {
      return createClass(plugins.concat([plugin]));
    }
    constructor(validator) {
      if (validator) {
        Object.keys(validator).forEach(key => {
          this[key] = validator[key];
        });
      }
    }
    next(schema) {
      return Schema.next(this, schema);
    }
    then(f) {
      return this.next(Schema.func(f));
    }
    satisfy(isValid, message) {
      return this.next(Schema.satisfy(isValid, message));
    }
    check(checkerSchema) {
      return this.next(Schema.check(checkerSchema));
    }
    when(checkerSchema, thenSchema, elseSchema) {
      return this.next(Schema.when(checkerSchema, thenSchema, elseSchema));
    }
    try_(schema, catchSchema) {
      return this.next(Schema.try_(schema, catchSchema));
    }
    key(key, valueSchema) {
      return this.next(Schema.key(key, valueSchema));
    }
    items(itemSchema) {
      return this.next(Schema.items(itemSchema));
    }
    _validate(value, name) {
      const result = this.type ? validate(this, value, Schema) : value;
      if (result instanceof Reject) {
        return result.withMoreInfo(name, value);
      }
      return result;
    }
    validate(value, name) {
      const newValue = this._validate(value, name);
      if (newValue instanceof Reject) {
        throw newValue.toError();
      }
      return newValue;
    }
  }

  plugins.forEach(plugin => addPlugin(Schema.prototype, plugin));

  const Identity = Schema.func(v => v);

  return Schema;
}

function validate(validator, value, Schema) {
  if (validator.type === 'reject') {
    return new Reject(validator.$message);
  } else if (validator.type === 'satisfy') {
    const valid = validator.$isValid(value);
    if (valid) {
      return value;
    } else {
      return Schema.reject(validator.$message);
    }
  } else if (validator.type === 'check') {
    const checkValue = evaluate(validator.$check, Schema, value);
    if (checkValue instanceof Reject) {
      return checkValue;
    } else {
      return value;
    }
  } else if (validator.type === 'next') {
    const newValue = evaluate(validator.$first, Schema, value);
    if (newValue instanceof Reject) {
      return newValue;
    } else {
      return evaluate(validator.$second, Schema, newValue);
    }
  } else if (validator.type === 'try') {
    const newValue = evaluate(validator.$try_, Schema, value);
    if (newValue instanceof Reject) {
      return evaluate(validator.$catch_, Schema, newValue);
    } else {
      return evaluate(newValue, Schema, value);;
    }
  } else if (validator.type === 'if') {
    const checkValue = evaluate(validator.$when, Schema, value);
    if (!(checkValue instanceof Reject)) {
      return evaluate(validator.$then, Schema, value);
    } else {
      return evaluate(validator.$else_, Schema, value);
    }
  } else if (validator.type === 'value') {
    return validator.$value;
  } else if (validator.type === 'function') {
    return evaluate(validator.$f(value), Schema, value);
  } else if (validator.type === 'key') {
    const key = validator.$key;
    const child = value[key];
    const name = `.${key}`;
    return evaluate(validator.$value || child, Schema, child, name);
  } else if (validator.type === 'array') {
    const newItems = [];
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      const name = `[${i}]`;
      const result = evaluate(validator.$item, Schema, item, name);
      if (result instanceof Reject) {
        return result;
      }
      newItems.push(result);
    }
    return newItems;
  }
  throw 'type is not specified';
}

function evaluate(schema, Schema, value, name) {
  // if (schema instanceof Schema) {
  if (schema && schema._validate) {
    return evaluate(schema._validate(value, name), Schema, value, name);
  }
  // console.log(schema instanceof Schema, schema);
  return schema;
}

function addPlugin(prototype, plugin) {
  Object.keys(plugin).forEach(key => {
    if (prototype[key]) {
      throw new Error(`PluginError: Function ${key} is already defined.`);
    }
    const f = plugin[key];
    if (typeof f !== 'function') {
      throw new Error(`PluginError: Plugin ${key} is mulformed. Value should be a function.`);
    }
    prototype[key] = f;
  });
}

module.exports = {
  createClass,
  SchemaValidatorError
};
