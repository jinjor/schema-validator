class SchemaValidatorError extends Error {
  constructor(message) {
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
const createSchemaClass = () => class Schema {
  static empty() {
    return new Schema();
  }
  constructor(validators, context) {
    this._validators = validators || [];
    this.context = context || {
      name: 'value'
    };
  }
  init(validators, context) {
    return new Schema(validators, context);
  }
  reject(message) {
    return new Reject(message);
  }
  break (value) {
    return new Break(value);
  }
  withContext(additional) {
    return this.init(this._validators, Object.assign({}, this.context, additional || {}));
  }
  name(name) {
    return this.withContext({
      name: name
    });
  }
  _first(validator) {
    return this.init([validator].concat(this._validators), this.context);
  }
  _last(validator) {
    return this.init(this._validators.concat([validator]), this.context);
  }
  first(f) {
    return this._first({
      _validate: f
    });
  }
  then(f) {
    return this._last({
      _validate: value => {
        const newValue = f(value);
        if (newValue instanceof Schema) {
          return newValue._validate(value);
        }
        return newValue;
      }
    });
  }
  check(f) {
    return this.then(value => {
      let result = f(value);
      if (result instanceof Schema) {
        result = result._validate(value);
      }
      if (result instanceof Reject) {
        return result;
      }
      return value;
    });
  }
  when(checkerSchema, thenSchema, elseSchema) {
    return this.then(value => {
      if (checkerSchema._isValid(value)) {
        return thenSchema;
      }
      if (elseSchema) {
        return elseSchema;
      }
      return value;
    });
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
  _isValid(value) {
    const newValue = this._validate(value);
    return !(newValue instanceof Reject);
  }
  _validate(value) {
    return validateHelp(this._validators, 0, this.context.name, value);
  }
  _validateAll(items, f) {
    const newItems = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemSchema = f(item, i);
      const result = itemSchema._validate(item);
      if (result instanceof Reject) {
        return result;
      }
      newItems.push(item);
    }
    return newItems;
  }
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

module.exports = {
  createClass: createSchemaClass,
  SchemaValidatorError: SchemaValidatorError,
};
