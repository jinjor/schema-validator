const predefinedPlugins = require('./plugins.js');

// schema object
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
    return new SchemaValidationError(message);
  }
  first(f) {
    return this.init([{
      f: f
    }].concat(this._validators));
  }
  then(f) {
    return this.init(this._validators.concat([{
      f: f
    }]));
  }
  validate(value) {
    // console.log(this._validators);
    return validateHelp(this._validators, 0, this.context.name, value, value)
  }
}

const validateHelp = (varidators, i, name, originalValue, value) => {
  if (i >= varidators.length) {
    return value;
  }
  const varidator = varidators[i];
  const newValue = varidator.f(value);
  if (newValue instanceof SchemaValidationError) {
    throw newValue.toError(name, originalValue);
  }
  return validateHelp(varidators, i + 1, name, originalValue, newValue);
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
