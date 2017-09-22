const createSchemaClass = require('./schema.js');
const predefinedPlugin = require('./predefined.js');

module.exports = userPlugin => {
  const cls = createClass([predefinedPlugin, userPlugin]);
  return cls.empty();
};

function createClass(plugins) {
  const cls = createSchemaClass();
  addPlugins(cls.prototype, plugins);
  return cls;
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
