const createSchemaClass = require('./schema.js');
const predefinedPlugin = require('./predefined.js');

module.exports = userPlugin => {
  const cls = createSchemaClass();
  [predefinedPlugin, userPlugin].forEach(plugin => addPlugin(cls.prototype, plugin));
  return cls.empty();
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
