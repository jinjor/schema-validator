const schema = require('./schema.js');
const predefinedPlugin = require('./predefined.js');

const core = schema.create([]);
module.exports = predefinedPlugin(core);
