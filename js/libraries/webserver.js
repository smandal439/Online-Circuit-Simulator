window.ArduinoLibs = window.ArduinoLibs || {};
window.ArduinoLibs['WebServer'] = {
  classes: ['WebServer'],
  transpile: [
    [/(\w+)\.on\(\)/g, '_a.serverOn($1)'],
    [/(\w+)\.send\(\)/g, '_a.serverSend($1)'],
    [/(\w+)\.arg\(\)/g, '_a.serverArg($1)'],
    [/(\w+)\.handleClient\(\)/g, '_a.serverHandleClient($1)'],
  ],
  constants: {
    HTTP_GET: 'GET',
    HTTP_POST: 'POST',
    HTTP_PUT: 'PUT',
    HTTP_DELETE: 'DELETE',
    HTTP_HEAD: 'HEAD',
    HTTP_OPTIONS: 'OPTIONS',
    HTTP_PATCH: 'PATCH',
    HTTP_ANY: 'ANY',
  },
  constructor: function (port) {
    return {
      __webserver: true,
      _port: port || 80,
      on: function () {},
      send: function () {},
      arg: function () {},
      handleClient: function () {},
      begin: function () {},
    };
  },
};
