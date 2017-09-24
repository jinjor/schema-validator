class SchemaValidatorError extends Error {
  constructor(message) {
    super();
    this.message = message;
  }
}

class Reject {
  constructor(message) {
    this.message = message;
  }
  toError() {
    const name = this.name || 'value';
    const stringValue = JSON.stringify(this.value);
    return new SchemaValidatorError(`${name} ${this.message}, but got ${stringValue}`);
  }
}

class Break {
  constructor(value) {
    this.value = value;
  }
}

// schema object
const createSchemaClass = plugins => {
  class Schema {
    constructor(validators) {
      this._validators = validators || [];
    }
    empty() {
      return init();
    }
    reject(message) {
      return new Reject(message);
    }
    break_(value) {
      return new Break(value);
    }
    _first(validator) {
      return init([validator].concat(this._validators));
    }
    _last(validator) {
      return init(this._validators.concat([validator]));
    }
    first(f) {
      return this._first({
        f: wrapValidate(f)
      });
    }
    then(f) {
      return this._last({
        f: wrapValidate(f)
      });
    }
    _when(schema, f) {
      return this.then(value => {
        const result = schema._validate(value);
        return f(value, result);
      });
    }
    when(checkerSchema, thenSchema, elseSchema) {
      return this._when(checkerSchema, (original, result) => {
        if (result instanceof Reject) {
          return elseSchema || original;
        }
        return thenSchema;
      });
    }
    check(checkerSchema) {
      return this._when(checkerSchema, (original, result) => {
        if (result instanceof Reject) {
          return result
        }
        return original;
      });
    }
    try_(schema, catchSchema) {
      return this._when(schema, (original, result) => {
        if (result instanceof Reject) {
          return catchSchema || original;
        }
        return result;
      });
    }
    _validate(value, name) {
      const result = validateHelp(this._validators, 0, value);
      if (result instanceof Reject) {
        result.name = (name || '') + (result.name || '');
        result.value = (typeof result.value === 'undefined') ? value : result.value;
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
    // this is here now for some reasons.
    key(key, valueSchema) {
      return this.empty()._last({
        f: value => {
          const child = value[key];
          const name = (typeof key === 'number') ? `[${key}]` : `.${key}`;
          return valueSchema._validate(child, name);
        }
      });
    }
    items(itemSchema) {
      return this.then(items => {
        const indexedSchemas = items.map((_, i) => {
          return this.key(i, itemSchema);
        });
        const newItems = [];
        for (let indexedSchema of indexedSchemas) {
          const result = indexedSchema._validate(items);
          if (result instanceof Reject) {
            return result;
          }
          newItems.push(result);
        }
        return newItems;
      });
    }
  }

  function init(validators) {
    return new Schema(validators);
  }

  function wrapValidate(f) {
    return value => {
      const newValue = f(value);
      if (newValue instanceof Schema) {
        return newValue._validate(value);
      }
      return newValue;
    };
  }
  plugins.forEach(plugin => addPlugin(Schema.prototype, plugin));
  return Schema;
}

function validateHelp(validators, i, value) {
  if (i >= validators.length) {
    return value;
  }
  const validator = validators[i];
  const newValue = validator.f(value);
  if (newValue instanceof Reject) {
    return newValue;
  } else if (newValue instanceof Break) {
    return newValue.value;
  }
  return validateHelp(validators, i + 1, newValue);
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
  createClass: createSchemaClass,
  SchemaValidatorError: SchemaValidatorError,
};
