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
      const instance = new Schema(typeName);
      Array.prototype.forEach.call(arguments, (arg, i) => {
        const propName = propNames[i];
        if (propName) {
          instance['$' + propName] = arg;
        }
      });
      return instance;
    }
    return memo;
  }, {});
}

function nextify(S) {
  return Object.keys(S).reduce((memo, key) => {
    const f = S[key];
    memo[key] = function() {
      // console.log('method', key, arguments);
      return S.next(this, f.apply(null, arguments));
    };
    return memo;
  }, {});
}

const createClass = plugins => {
  const Schema = function Schema(typeName) {
    this.$type = typeName || 'identity';
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
  // bare value
  if (!schema.$type) {
    return schema;
  }

  if (schema.$type === 'identity') {
    return value;
  } else if (schema.$type === 'value') {
    return schema.$value;
  } else if (schema.$type === 'f') {
    return evaluate(schema.$f(value), name, value);
  } else if (schema.$type === 'reject') {
    return new Reject(schema.$message, name, value);
  } else if (schema.$type === 'satisfy') {
    const valid = schema.$isValid(value);
    if (valid) {
      return value;
    } else {
      return new Reject(schema.$message, name, value);
    }
  } else if (schema.$type === 'check') {
    const checkValue = evaluate(schema.$check, name, value);
    if (checkValue instanceof Reject) {
      return checkValue;
    } else {
      return value;
    }
  } else if (schema.$type === 'next') {
    const newValue = evaluate(schema.$first, name, value);
    if (newValue instanceof Reject) {
      return newValue;
    } else {
      return evaluate(optional(schema.$second, newValue), name, newValue);
    }
  } else if (schema.$type === 'try_') {
    const newValue = evaluate(schema.$try_, name, value);
    if (newValue instanceof Reject) {
      return evaluate(schema.$catch_, name, newValue);
    } else {
      return evaluate(newValue, name, value);
    }
  } else if (schema.$type === 'when') {
    const checkValue = evaluate(schema.$when, name, value);
    if (!(checkValue instanceof Reject)) {
      return evaluate(optional(schema.$then, value), name, value);
    } else {
      return evaluate(optional(schema.$else_, value), name, value);
    }
  } else if (schema.$type === 'key') {
    const key = schema.$key;
    const child = value[key];
    const newName = name + `.${key}`;
    return evaluate(optional(schema.$value, child), newName, child);
  } else if (schema.$type === 'items') {
    const newItems = [];
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      const newName = name + `[${i}]`;
      const result = evaluate(schema.$item, newName, item);
      if (result instanceof Reject) {
        return result;
      }
      newItems.push(result);
    }
    return newItems;
  }
  throw 'type is not specified: ' + schema.$type;
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
