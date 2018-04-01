exports.load = function(pluginType, pluginName) {
  return require('./' + pluginType + '/' + pluginName + '/' + pluginName);
};