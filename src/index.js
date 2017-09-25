const schema = require('./schema.js');
const predefinedPlugin = require('./predefined.js');

const cls = schema.createClass([]);
const core = new cls();
module.exports = predefinedPlugin(core);
