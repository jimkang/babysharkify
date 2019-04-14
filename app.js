var handleError = require('handle-error-web');
var RouteState = require('route-state');
var wireControls = require('./dom/wire-controls');
var sharkifyFlow = require('./flows/sharkify-flow');

var routeState;

(function go() {
  window.onerror = reportTopLevelError;

  routeState = RouteState({
    followRoute,
    windowObject: window
  });
  routeState.routeFromHash();

  wireControls({ onSharkify });

  function onSharkify({ text }) {
    routeState.addToRoute({ text });
  }
})();

function followRoute({ text }) {
  if (text) {
    sharkifyFlow({ text });
  }
}

function reportTopLevelError(msg, url, lineNo, columnNo, error) {
  handleError(error);
}
