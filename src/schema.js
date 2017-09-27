class SchemaValidatorError extends Error {
  constructor(message) {
    super();
    this.message = message;
  }
}

class Reject {
  constructor(message, name, value) {
    this.message = message;
    this.name = name;
    this.value = value;
  }
  toError() {
    const name = this.name;
    const stringValue = JSON.stringify(this.value);
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
        $value: (typeof valueSchema === 'undefined' ? Identity : valueSchema)
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
        $then: (typeof thenSchema === 'undefined' ? Identity : thenSchema),
        $else_: (typeof elseSchema === 'undefined' ? Identity : elseSchema)
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
      this._validator = validator;
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
      return this._validator ? validate(this._validator, (name || 'value'), value) : value;
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

  const Identity = new Schema({
    type: 'identity'
  });

  return Schema;
}

function validate(validator, name, value) {
  // console.log('validate', validator.type, name);
  if (validator.type === 'identity') {
    return value;
  } else if (validator.type === 'reject') {
    return new Reject(validator.$message, name, value);
  } else if (validator.type === 'satisfy') {
    const valid = validator.$isValid(value);
    if (valid) {
      return value;
    } else {
      return new Reject(validator.$message, name, value);
    }
  } else if (validator.type === 'check') {
    const checkValue = evaluate(validator.$check, name, value);
    if (checkValue instanceof Reject) {
      return checkValue;
    } else {
      return value;
    }
  } else if (validator.type === 'next') {
    const newValue = evaluate(validator.$first, name, value);
    if (newValue instanceof Reject) {
      return newValue;
    } else {
      return evaluate(validator.$second, name, newValue);
    }
  } else if (validator.type === 'try') {
    const newValue = evaluate(validator.$try_, name, value);
    if (newValue instanceof Reject) {
      return evaluate(validator.$catch_, name, newValue);
    } else {
      return evaluate(newValue, name, value);
    }
  } else if (validator.type === 'if') {
    const checkValue = evaluate(validator.$when, name, value);
    if (!(checkValue instanceof Reject)) {
      return evaluate(validator.$then, name, value);
    } else {
      return evaluate(validator.$else_, name, value);
    }
  } else if (validator.type === 'value') {
    return validator.$value;
  } else if (validator.type === 'function') {
    return evaluate(validator.$f(value), name, value);
  } else if (validator.type === 'key') {
    const key = validator.$key;
    const child = value[key];
    const newName = name + `.${key}`;
    return evaluate(validator.$value, newName, child);
  } else if (validator.type === 'array') {
    const newItems = [];
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      const newName = name + `[${i}]`;
      const result = evaluate(validator.$item, newName, item);
      if (result instanceof Reject) {
        return result;
      }
      newItems.push(result);
    }
    return newItems;
  }
  throw 'type is not specified';
}

function evaluate(schema, name, value) {
  if (schema && schema._validate) {
    return evaluate(schema._validate(value, name), name, value);
  }
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
