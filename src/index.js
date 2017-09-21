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
  _break(message) {
    return reject(message, true);
  }
  first(validator) {
    return this.init([validator].concat(this._validators), this.context);
  }
  last(validator) {
    return this.init(this._validators.concat([validator]), this.context);
  }
  then(f) {
    return this.last({
      _validate: f
    });
  }
  validate(value) {
    const newValue = this._validate(value);
    if (newValue instanceof SchemaValidationError) {
      if (newValue.isBreak) {
        return newValue.message;
      }
      throw newValue.toError(this.context.name, value);
    }
    return newValue;
  }
  isValid(value) {
    const newValue = this._validate(value);
    return !(newValue instanceof SchemaValidationError && !newValue.isBreak);
  }
  _validate(value) {
    return validateHelp(this._validators, 0, this.context.name, value);
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

function validateHelp(validators, i, name, value) {
  if (i >= validators.length) {
    return value;
  }
  const validator = validators[i];
  const newValue = validator._validate(value);
  if (newValue instanceof SchemaValidationError) {
    if (newValue.isBreak) {
      return newValue.message;
    }
    return newValue;
  }
  return validateHelp(validators, i + 1, name, newValue);
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
