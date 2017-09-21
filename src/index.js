const schema = require('./schema.js');
const predefinedPlugins = require('./plugins.js');

module.exports = userPlugin => {
  const plugins = predefinedPlugins.concat([userPlugin || {}]);
  const cls = schema.createClass(plugins);
  return cls.empty();
};
