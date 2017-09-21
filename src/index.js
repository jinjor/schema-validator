const predefinedPlugins = require('./plugins.js');
const breakable = require('./breakable.js');
const Reject = breakable.Reject;
const Break = breakable.Break;

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
    return new Reject(message);
  }
  _break(value) {
    return new Break(value);
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
    if (newValue instanceof Reject) {
      throw newValue.toError(this.context.name, value);
    } else if (newValue instanceof Break) {
      return newValue.value;
    }
    return newValue;
  }
  isValid(value) {
    const newValue = this._validate(value);
    return !(newValue instanceof Reject);
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
  if (newValue instanceof Reject) {
    return newValue;
  } else if (newValue instanceof Break) {
    return newValue.value;
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
