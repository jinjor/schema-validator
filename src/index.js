const predefinedPlugins = require('./plugins.js');

// schema object
const reject = message => new SchemaValidationError(message);
const createClass = () => class Schema {
  constructor(validators, context) {
    this._validators = validators || [];
    this.context = context || {
      name: 'value'
    };
  }
  init(validators, context) {
    return new Schema(validators || this._validators, context || this.context);
  }
  withContext(additional) {
    return this.init(undefined, Object.assign({}, this.context, additional || {}));
  }
  reject(message) {
    return reject(message);
  }
  first(f) {
    return this.init([{
      f: f
    }].concat(this._validators));
  }
  last(validator) {
    return this.init(this._validators.concat([validator]));
  }
  then(f) {
    return this.last({
      f: f
    });
  }
  validate(value) {
    return validateHelp(this._validators, 0, this.context.name, value, value)
  }
  doc(indent) {
    indent = indent || '';
    return this._validators.map(validator => {
      if (validator.type === 'condition') {
        return validator.message;
      }
      if (validator.type === 'collection') {
        return 'each item:\n' + validator.itemSchema.doc(indent + '  ');
      }
      if (validator.type === 'field') {
        return 'field ' + validator.key + ':\n' + validator.valueSchema.doc(indent + '  ');
      }
      return validator.message;
    }).filter(mes => !!mes).map(mes => indent + '- ' + mes).join('\n');
  }
}

const validateHelp = (validators, i, name, originalValue, value) => {
  if (i >= validators.length) {
    return value;
  }
  const validator = validators[i];
  const newValue =
    (validator.type === 'condition') ? validateCondition(validator, value) :
    (validator.type === 'collection') ? validateCollection(validator, value) :
    (validator.type === 'field') ? validateField(validator, value) :
    validator.f(value);
  if (newValue instanceof SchemaValidationError) {
    throw newValue.toError(name, originalValue);
  }
  return validateHelp(validators, i + 1, name, originalValue, newValue);
}

const validateCondition = (validator, value) => {
  return validator.f(value) ? value : reject(validator.message);
};
const validateCollection = (validator, value) => {
  return validator.toKeys(value).map(key => {
    const item = value[key];
    const name = validator.toItemName(key);
    return validator.itemSchema.name(name).validate(item);
  });
}
const validateField = (validator, value) => {
  valueSchema = validator.valueSchema;
  if (validator.requiredIf && !validator.requiredIf(value)) {
    valueSchema = valueSchema.required();
  }
  const key = validator.key;
  const v = value[key];
  return Object.assign({}, value, {
    [key]: valueSchema.name(validator.parentName + '.' + key).validate(v)
  });
}


// validate
class SchemaValidationError {
  constructor(message) {
    this.message = message;
  }
  toError(name, value) {
    value = JSON.stringify(value, null, 2);
    return new Error(name + ' ' + this.message + ', but got ' + value);
  }
}

// extension
const addPlugins = (schema, plugins) => {
  plugins.forEach(addPlugin(schema));
};
const addPlugin = schema => plugin => {
  Object.keys(plugin).forEach(key => {
    if (schema[key]) {
      throw new Error(`PluginError: Function ${key} is already defined.`);
    }
    const f = plugin[key];
    if (typeof f !== 'function') {
      throw new Error(`PluginError: Plugin ${key} is mulformed. Value should be a function.`);
    }
    schema[key] = f;
  });
}

module.exports = userPlugin => {
  const plugins = predefinedPlugins.concat([userPlugin || {}]);
  const cls = createClass();
  addPlugins(cls.prototype, plugins);
  return new cls();
};
