const schema = require('./schema.js');
const predefinedPlugin = require('./predefined.js');

module.exports = userPlugin => {
  const cls = schema.createClass([predefinedPlugin, userPlugin]);
  return new cls();
}
