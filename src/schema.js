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
        type: 'if',
        then: f
      });
    }
    then(f) {
      return this._when2(null, f);
    }
    _satisfy(message, isValid) {
      return this._when2(isValid, null, _ => sv.reject(message));
    }
    map(f) {
      return this._when2(null, f);
    }
    _when2(isValid, then, else_) {
      return this._last({
        type: 'if',
        if_: isValid,
        then: then,
        else_: else_
      });
    }
    _when(schema, onSuccess, onError) {
      return this.then(value => {
        const result = schema._validate(value);
        if (result instanceof Reject) {
          return onError ? onError(value) : result;
        }
        return onSuccess ? onSuccess(result, value) : result;
      });
    }
    when(checkerSchema, thenSchema, elseSchema) {
      return this._when(checkerSchema, (result, original) => {
        return thenSchema;
      }, original => {
        return elseSchema || original;
      });
    }
    check(schema) {
      return this._when(schema, (result, original) => {
        return original;
      });
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
        type: 'if',
        then: value => {
          const child = value[key];
          return valueSchema._validate(child, name);
        }
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
      return newValue._validate(value);
    }
    return newValue;
  };
}

function validateHelp(validators, i, value, Schema) {
  if (i >= validators.length) {
    return value;
  }
  const validator = validators[i];
  if (validator.type === 'if') {
    const valid = validator.if_ ? validator.if_(value) : true;
    if (valid) {
      const newValue = wrapValidate(validator.then || (value => value), Schema)(value);
      if (newValue instanceof Reject) {
        return newValue;
      } else if (newValue instanceof Break) {
        return newValue.value;
      }
      return validateHelp(validators, i + 1, newValue, Schema);
    } else {
      return validator.else_(value);
    }
  }
  throw 'unexpected type';
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
