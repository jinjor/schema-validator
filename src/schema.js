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
  toError(name, value) {
    const stringValue = JSON.stringify(value);
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
    constructor(validators, context) {
      this._validators = validators || [];
      this.context = context || {
        name: 'value'
      };
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
    _withContext(additional) {
      return init(this._validators, Object.assign({}, this.context, additional || {}));
    }
    name(name) {
      return this._withContext({
        name: name
      });
    }
    _first(validator) {
      return init([validator].concat(this._validators), this.context);
    }
    _last(validator) {
      return init(this._validators.concat([validator]), this.context);
    }
    first(f) {
      return this._first({
        _validate: wrapValidate(f)
      });
    }
    then(f) {
      return this._last({
        _validate: wrapValidate(f)
      });
    }
    _when(schema, f) {
      return this.then(value => {
        let result = schema._validate(value);
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
    _check(checkerSchema) {
      return this._when(checkerSchema, (original, result) => {
        if (result instanceof Reject) {
          return result
        }
        return original;
      });
    }
    check(f) {
      return this._check(this.empty().then(f));
    }
    try_(schema, catchSchema) {
      return this._when(schema, (original, result) => {
        if (result instanceof Reject) {
          return catchSchema || original;
        }
        return result;
      });
    }
    _validate(value) {
      return validateHelp(this._validators, 0, this.context.name, value);
    }
    validate(value) {
      const newValue = this._validate(value);
      if (newValue instanceof Reject) {
        throw newValue.toError(this.context.name, value);
      } else if (newValue instanceof Break) {
        return newValue.value;
      }
      return newValue;
    }
    _validateAll(items, toItemSchema) {
      const newItems = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemSchema = toItemSchema(item, i);
        const result = itemSchema._validate(item);
        if (result instanceof Reject) {
          return result;
        }
        newItems.push(item);
      }
      return newItems;
    }
  }

  function init(validators, context) {
    return new Schema(validators, context);
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

function validateHelp(validators, i, name, value) {
  if (i >= validators.length) {
    return value;
  }
  const validator = validators[i];
  const newValue = validator._validate(value);
  if (newValue instanceof Reject) {
    return newValue;
  } else if (newValue instanceof Break) {
    return newValue.value;
  }
  return validateHelp(validators, i + 1, name, newValue);
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
