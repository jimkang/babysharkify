var handleError = require('handle-error-web');
var RouteState = require('route-state');

var routeState;

(function go() {
  window.onerror = reportTopLevelError;
  routeState = RouteState({
    followRoute,
    windowObject: window
  });
  routeState.routeFromHash();
   
})();

function followRoute({ text }) {
}
function reportTopLevelError(msg, url, lineNo, columnNo, error) {
  handleError(error);
}
