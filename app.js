var handleError = require('handle-error-web');
var RouteState = require('route-state');
var wireControls = require('./dom/wire-controls');
var sharkifyFlow = require('./flows/sharkify-flow');
var findWhere = require('lodash.findwhere');

var routeState;
var voices = window.speechSynthesis.getVoices();

(function go() {
  window.onerror = reportTopLevelError;

  routeState = RouteState({
    followRoute,
    windowObject: window
  });
  routeState.routeFromHash();
})();

function followRoute({ text, selectedVoiceName }) {
  if (text) {
    let voice = findWhere(voices, { name: selectedVoiceName });
    if (!voice) {
      voice = findWhere(voices, { default: true });
    }
    if (!voice) {
      voice = findWhere(voices, { lang: 'en-US' });
    }
    if (voice) {
      selectedVoiceName = voice.name;
      sharkifyFlow({ text, voice });
    }
  }

  wireControls({ onSharkify, voices, selectedVoiceName });

  function onSharkify({ text, selectedVoiceName }) {
    routeState.addToRoute({ text, selectedVoiceName });
  }
}

function reportTopLevelError(msg, url, lineNo, columnNo, error) {
  handleError(error);
}
