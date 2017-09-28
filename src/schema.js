const Reject = class SchemaValidatorError extends Error {
  constructor(message, name, value) {
    super();
    const stringValue = JSON.stringify(value);
    this.message = `${name} ${message}, but got ${stringValue}`;
  }
}

function optional(value, defaultValue) {
  return (typeof value === 'undefined') ? defaultValue : value;
}

const T = {
  identity: [],
  value: ['value'],
  f: ['f'],
  key: ['key', 'value'],
  next: ['first', 'second'],
  satisfy: ['isValid', 'message'],
  when: ['when', 'then', 'else_'],
  check: ['check'],
  try_: ['try', 'catch'],
  items: ['item'],
  reject: ['message']
};

function makeConstructors(Schema) {
  return Object.keys(T).reduce((memo, typeName) => {
    const propNames = T[typeName];
    memo[typeName] = function() {
      const props = Array.prototype.reduce.call(arguments, (memo, arg, i) => {
        const propName = propNames[i];
        if (propName) {
          memo[propName] = arg;
        }
        return memo;
      }, {
        type: typeName
      });
      return new Schema(props);
    }
    return memo;
  }, {});
}

function nextify(simple) {
  return Object.keys(simple).reduce((memo, key) => {
    const f = simple[key];
    memo[key] = function() {
      return simple.next(this, f.apply(this, arguments));
    };
    return memo;
  }, {});
}

const createClass = plugins => {
  const Schema = function Schema(validator) {
    this.validator = validator;
  };
  const S = Object.assign(makeConstructors(Schema), {
    extend(plugin) {
      return createClass(plugins.concat([plugin]));
    },
    // extend2(simple, advanced) {
    //   const plugin = Object.assign({}, nextify(simple), advanced);
    //   return createClass(plugins.concat([plugin]));
    // }
  });
  const methods = Object.assign(nextify(S), {
    next(schema) {
      return S.next(this, schema);
    },
    then(f) {
      return S.next(this, S.f(f));
    },
    validate(value, name) {
      const newValue = evaluate(this, (name || 'value'), value);
      if (newValue instanceof Reject) {
        throw newValue;
      }
      return newValue;
    }
  });
  Schema.prototype = methods;

  Object.keys(S).forEach(key => {
    Schema[key] = S[key];
  });
  plugins.forEach(plugin => addPlugin(Schema.prototype, plugin));
  return Schema;
}

function evaluate(schema, name, value) {
  if (!schema || !schema.validate) {
    return schema;
  }
  const validator = schema.validator;
  if (!validator) {
    return value;
  }
  if (validator.type === 'identity') {
    return value;
  } else if (validator.type === 'value') {
    return validator.value;
  } else if (validator.type === 'f') {
    return evaluate(validator.f(value), name, value);
  } else if (validator.type === 'reject') {
    return new Reject(validator.message, name, value);
  } else if (validator.type === 'satisfy') {
    const valid = validator.isValid(value);
    if (valid) {
      return value;
    } else {
      return new Reject(validator.message, name, value);
    }
  } else if (validator.type === 'check') {
    const checkValue = evaluate(validator.check, name, value);
    if (checkValue instanceof Reject) {
      return checkValue;
    } else {
      return value;
    }
  } else if (validator.type === 'next') {
    const newValue = evaluate(validator.first, name, value);
    if (newValue instanceof Reject) {
      return newValue;
    } else {
      return evaluate(optional(validator.second, newValue), name, newValue);
    }
  } else if (validator.type === 'try_') {
    const newValue = evaluate(validator.try_, name, value);
    if (newValue instanceof Reject) {
      return evaluate(validator.catch_, name, newValue);
    } else {
      return evaluate(newValue, name, value);
    }
  } else if (validator.type === 'when') {
    const checkValue = evaluate(validator.when, name, value);
    if (!(checkValue instanceof Reject)) {
      return evaluate(optional(validator.then, value), name, value);
    } else {
      return evaluate(optional(validator.else_, value), name, value);
    }
  } else if (validator.type === 'key') {
    const key = validator.key;
    const child = value[key];
    const newName = name + `.${key}`;
    return evaluate(optional(validator.value, child), newName, child);
  } else if (validator.type === 'items') {
    const newItems = [];
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      const newName = name + `[${i}]`;
      const result = evaluate(validator.item, newName, item);
      if (result instanceof Reject) {
        return result;
      }
      newItems.push(result);
    }
    return newItems;
  }
  throw 'type is not specified: ' + validator.type;
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
  createClass,
  SchemaValidatorError: Reject
};
