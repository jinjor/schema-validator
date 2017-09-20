const predefinedPlugins = require('./plugins.js');
const common = require('./common.js');
const SchemaValidationError = common.SchemaValidationError;
const reject = common.reject;

// schema object
const createClass = () => class Schema {
  constructor(validators, context) {
    this._validators = validators || [];
    this.context = context || {
      name: 'value'
    };
  }
  init(validators, context) {
    return new Schema(validators, context);
  }
  withContext(additional) {
    return this.init(this._validators, Object.assign({}, this.context, additional || {}));
  }
  reject(message) {
    return reject(message);
  }
  first(validator) {
    return this.init([validator].concat(this._validators), this.context);
  }
  last(validator) {
    return this.init(this._validators.concat([validator]), this.context);
  }
  then(f) {
    return this.last({
      validate: f
    });
  }
  validate(value) {
    return validateHelp(this._validators, 0, this.context.name, value, value)
  }
  doc(indent) {
    indent = indent || '';
    return this._validators
      .filter(validator => validator.doc)
      .map(validator => validator.doc(indent))
      .map(mes => indent + '- ' + mes)
      .join('\n');
  }
}

function validateHelp(validators, i, name, originalValue, value) {
  if (i >= validators.length) {
    return value;
  }
  const validator = validators[i];
  const newValue = validator.validate(value);
  if (newValue instanceof SchemaValidationError) {
    throw newValue.toError(name, originalValue);
  }
  return validateHelp(validators, i + 1, name, originalValue, newValue);
}

function addPlugins(schema, plugins) {
  plugins.forEach(plugin => addPlugin(schema, plugin));
}

function addPlugin(schema, plugin) {
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
