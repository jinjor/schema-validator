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
      if (Array.isArray(validators)) {
        this._validators = validators;
      } else {
        this._validators = validators ? [validators] : [];
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
    _first(validator) {
      return new Schema([validator].concat(this._validators));
    }
    _last(validator) {
      return new Schema(this._validators.concat([validator]));
    }
    first(f) {
      return this._first({
        type: 'func',
        f: f
      });
    }
    then(f) {
      return this._last({
        type: 'func',
        f: f
      });
    }
    _satisfy(message, isValid) {
      return this.when(F(value => isValid(value) || sv.reject(message)), Identity, true);
    }
    when(checkerSchema, thenSchema, elseSchema) {
      return this._last({
        type: 'if',
        if_: checkerSchema,
        then: thenSchema,
        else_: elseSchema
      });
    }
    check(schema) {
      return this.when(schema, Identity, true);
    }
    try_(schema, catchSchema) {
      return this.when(schema, Identity, F(original => {
        return catchSchema || original;
      }));
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
        type: 'func',
        f: value => {
          const child = value[key];
          return valueSchema._validate(child, name);
        }
      });
    }
    flatten(toKeySchemas) {
      return this.then(value => {
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
  const F = f => new Schema({
    type: 'func',
    f: f
  });
  const True = new Schema({
    type: 'value',
    value: true
  });
  const Identity = F(v => v);

  plugins.forEach(plugin => addPlugin(Schema.prototype, plugin));
  // empty schema instance
  const sv = new Schema();
  return sv;
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
  if (validator.type === 'if') {
    const valid = evaluate(validator.if_, Schema, value);
    if (!(valid instanceof Reject)) {
      return evaluate(validator.then, Schema, value);
    } else if (validator.else_ === true) {
      return valid; //return reject
    } else {
      return evaluate(validator.else_, Schema, value);
    }
  } else if (validator.type === 'value') {
    return validator.value;
  } else if (validator.type === 'func') {
    const newValue = validator.f(value);
    return evaluate(newValue, Schema, value);
  }
  throw 'type is not specified';
}

function evaluate(schema, Schema, value) {
  if (schema instanceof Schema) {
    return evaluate(schema._validate(value), Schema, value);
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
