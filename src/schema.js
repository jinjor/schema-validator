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

class Break {
  constructor(value) {
    this.value = value;
  }
}

// schema object
const create = plugins => {
  class Schema {
    constructor(validator) {
      if (validator) {
        Object.keys(validator).forEach(key => {
          this[key] = validator[key];
        });
      }
    }
    extend(plugin) {
      return create(plugins.concat([plugin]));
    }
    reject(message) {
      return new Reject(message);
    }
    break_(value) {
      return new Break(value);
    }
    next(schema) {
      return new Schema({
        type: 'next',
        $first: this,
        $second: schema,
      });
    }
    then(f) {
      return this.next(F(f));
    }
    satisfy(isValid, message) {
      return new Schema({
        type: 'satisfy',
        $isValid: isValid,
        $message: message
      });
    }
    check(checkerSchema) {
      return this.next(new Schema({
        type: 'check',
        $check: checkerSchema
      }));
    }
    _when(checkerSchema, thenSchema, elseSchema) {
      return new Schema({
        type: 'if',
        $when: checkerSchema,
        $then: thenSchema || Identity,
        $else_: elseSchema || Identity
      });
    }
    when(checkerSchema, thenSchema, elseSchema) {
      return this.next(this._when(checkerSchema, thenSchema, elseSchema));
    }
    try_(schema, catchSchema) {
      return this.next(new Schema({
        type: 'try',
        $try_: schema,
        $catch_: catchSchema
      }));
    }
    _validate(value, name) {
      let result = null;
      if (this.type) {
        result = validateHelpHelp(this, value, Schema)
      } else {
        result = value;
      }
      if (result instanceof Reject) {
        return result.withMoreInfo(name, value);
      }
      if (result instanceof Break) {
        return newValue.value;
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
    key(key, valueSchema) {
      return sv.next(new Schema({
        type: 'key',
        $key: key,
        $value: valueSchema
      }));
    }
    items(itemSchema) {
      return this.next(new Schema({
        type: 'array',
        $item: itemSchema
      }));
    }
  }
  const F = f => new Schema({
    type: 'function',
    $f: f
  });
  const True = new Schema({
    type: 'value',
    $value: true
  });
  const Identity = F(v => v);

  plugins.forEach(plugin => addPlugin(Schema.prototype, plugin));
  // empty schema instance
  const sv = new Schema();
  return sv;
}

function validateHelpHelp(validator, value, Schema) {
  if (validator instanceof Break) {
    return validator.value;
  }
  if (validator.type === 'satisfy') {
    const valid = validator.$isValid(value);
    if (valid) {
      return value;
    } else {
      return new Reject(validator.$message);
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
    console.log('child', child);
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
  if (schema instanceof Schema) {
    return evaluate(schema._validate(value, name), Schema, value, name);
  }
  if (schema instanceof Break) {
    return schema.value;
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
  create: create,
  SchemaValidatorError: SchemaValidatorError,
};
