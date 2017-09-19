const predefinedPlugins = require('./plugins.js');

// schema object
class Schema {
  constructor(validate, context) {
    this._validate = validate || (value => value);
    this.context = context || {
      name: 'value'
    };
  }
  init(validate, context) {
    return new Schema(validate, context);
  }
  withContext(additional) {
    return this.init(this._validate, Object.assign({}, this.context, additional || {}));
  }
  then(f) {
    return this.init(value => {
      const newValue = this._validate(value);
      if (newValue instanceof SchemaValidationError) {
        return newValue;
      }
      if (newValue instanceof Schema) {
        return f(newValue.validate(value));
      }
      return f(newValue);
    });
  }
  next(nextSchema) {
    return this.then(value => {
      return nextSchema.validate(value);
    });
  }
  check(f, message) {
    return this.then(value => {
      return f(value) ? value : this.reject(message);
    });
  }
  reject(message) {
    return new SchemaValidationError(message);
  }
  validate(value) {
    var newValue = this._validate(value);
    if (newValue instanceof SchemaValidationError) {
      throw makeError(this.context.name, newValue.message, value);
    }
    if (newValue instanceof Schema) {
      return validate(newValue)(value);
    }
    return newValue;
  }
}

// validate
class SchemaValidationError {
  constructor(message) {
    this.message = message;
  }
}
const makeError = (name, message, value) => {
  value = JSON.stringify(value, null, 2);
  return new Error(name + ' ' + message + ', but got ' + value);
};

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
  addPlugins(Schema.prototype, plugins);
  return new Schema();
};
