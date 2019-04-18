var handleError = require('handle-error-web');
var RouteState = require('route-state');
var wireControls = require('./dom/wire-controls');
var sharkifyFlow = require('./flows/sharkify-flow');
var findWhere = require('lodash.findwhere');

var routeState;
var voices;

// Has the user clicked on anything yet so that
// audio can play on Chrome?
var interacted = false;

(function go() {
  window.onerror = reportTopLevelError;
  voices = window.speechSynthesis.getVoices();

  routeState = RouteState({
    followRoute,
    windowObject: window
  });

  routeWhenVoicesAreReady();
})();

// Chrome seems to need a moment.
function routeWhenVoicesAreReady() {
  voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    routeState.routeFromHash();
  } else {
    //console.log('waiting');
    setTimeout(routeWhenVoicesAreReady, 200);
  }
}

function followRoute({ text, selectedVoiceName }) {
  let voice = findWhere(voices, { name: selectedVoiceName });
  if (!voice) {
    voice = findWhere(voices, { default: true });
  }
  if (!voice || voice.lang === 'en-US') {
    voice = findWhere(voices, { lang: 'en-GB' });
  }
  if (voice) {
    selectedVoiceName = voice.name;
  }
  if (voice && text && (interacted || !isChrome())) {
    sharkifyFlow({ text, voice }); //, maxRate: isChrome() ? 2.0 : undefined });
  }

  wireControls({ onSharkify, voices, selectedVoiceName, text });

  function onSharkify({ text, selectedVoiceName }) {
    interacted = true;
    routeState.addToRoute({ text, selectedVoiceName });
  }
}

function isChrome() {
  return window.navigator.vendor.indexOf('Google') !== -1;
}

function reportTopLevelError(msg, url, lineNo, columnNo, error) {
  handleError(error);
}
