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
    constructor(validators) {
      this._validators = validators || [];
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
    _first(validator) {
      return new Schema([validator].concat(this._validators));
    }
    _last(validator) {
      return new Schema(this._validators.concat([validator]));
    }
    first(f) {
      return this._first({
        type: 'function',
        f: f
      });
    }
    then(f) {
      return this._last({
        type: 'function',
        f: f
      });
    }
    _satisfy(message, isValid) {
      return this._when2(isValid, new Schema([{
        type: 'function',
        f: original => original
      }]), sv.reject(message));
    }
    map(f) {
      return this._last({
        type: 'function',
        f: f
      });
    }
    _when2(isValid, then, else_) {
      return this._last({
        type: 'if2',
        if_: new Schema([{
          type: 'function',
          f: isValid || (_ => true)
        }]),
        then: then || new Schema([{
          type: 'function',
          f: original => original
        }]),
        else_: else_
      });
    }
    _when(schema, onSuccess, onError) {
      return this._last({
        type: 'if2',
        if_: schema || True,
        then: new Schema([{
          type: 'function',
          f: onSuccess || (original => original)
        }]),
        else_: onError
      });
    }
    when(checkerSchema, thenSchema, elseSchema) {
      return this._last({
        type: 'if2',
        if_: checkerSchema || True,
        then: thenSchema,
        else_: elseSchema
      });
    }
    check(schema) {
      return this._when(schema, original => original);
    }
    try_(schema, catchSchema) {
      return this._when(schema, null, original => {
        return catchSchema || original;
      });
    }
    _validate(value, name) {
      const result = validateHelp(this._validators, 0, value, Schema);
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
      const name = (typeof key === 'number') ? `[${key}]` : `.${key}`;
      return sv._last({
        type: 'if2',
        if_: new Schema([{
          type: 'value',
          value: true
        }]),
        then: new Schema([{
          type: 'function',
          f: value => {
            const child = value[key];
            return valueSchema._validate(child, name);
          }
        }]),
        else_: sv.reject('else')
      });
    }
    flatten(toKeySchemas) {
      return this.map(value => {
        const newItems = [];
        for (let schema of toKeySchemas(value)) {
          const result = schema._validate(value);
          if (result instanceof Reject) {
            return result;
          }
          newItems.push(result);
        }
        return newItems;
      });
    }
  }
  const True = new Schema([{
    type: 'value',
    value: true
  }]);

  plugins.forEach(plugin => addPlugin(Schema.prototype, plugin));
  // empty schema instance
  const sv = new Schema();
  return sv;
}

function wrapValidate(f, Schema) {
  if (!Schema) {
    throw new Error('Schema not found');
  }
  return value => {
    const newValue = f(value);
    if (newValue instanceof Schema) {
      return wrapValidate(newValue._validate.bind(newValue), Schema)(value);
      // return newValue._validate(value);
    }
    return newValue;
  };
}

function validateHelp(validators, i, value, Schema) {
  if (i >= validators.length) {
    return value;
  }
  const validator = validators[i];
  const newValue = validateHelpHelp(validator, value, Schema);
  if (newValue instanceof Reject) {
    return newValue;
  }
  if (newValue instanceof Break) {
    return newValue.value;
  }
  return validateHelp(validators, i + 1, newValue, Schema);
}

function validateHelpHelp(validator, value, Schema) {
  if (validator instanceof Break) {
    return validator.value;
  }
  if (validator.type === 'if2') {
    const valid = validator.if_._validate(value);
    if (!(valid instanceof Reject)) {
      // const newValue = validator.then._validate(value);
      return wrapValidate2(validator.then, Schema, value);
    } else {
      // const newValue = validator.else_._validate(value);
      return wrapValidate2(newValue.else_, Schema, value);
    }
  } else if (validator.type === 'value') {
    return validator.value;
  } else if (validator.type === 'function') {
    const newValue = validator.f(value);
    return wrapValidate2(newValue, Schema, value);
  }
  throw 'type is not specified';
}

function wrapValidate2(schema, Schema, value) {
  if (schema instanceof Reject) {
    return schema;
  }
  if (schema instanceof Break) {
    return schema.value;
  }
  if (schema instanceof Schema) {
    const newValue = schema._validate(value);
    return wrapValidate2(newValue, Schema, value);
  } else {
    return schema;
  }
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
