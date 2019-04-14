var request = require('basic-browser-request');
var waterfall = require('async-waterfall');
var CollectCtor = require('collect-in-channel');
// TODO: Abstract the three things above.
var curry = require('lodash.curry');
var handleError = require('handle-error-web');
var bodyMover = require('request-body-mover');
var findWhere = require('lodash.findwhere');

var config = require('../config');
var synth = window.speechSynthesis;

var pitches = [0.0, 0.5, 2.0];

function sharkifyFlow({ text }) {
  var channel = {
    text,
    wordworkerKey: config.wordworker.key
  };
  var Collect = CollectCtor({ channel });

  waterfall(
    [
      curry(getSyllables)(channel),
      Collect({ props: ['syllablesGroupedByWord'] }),
      singIt
    ],
    handleError
  );
}

function getSyllables({ wordworkerKey, text }, done) {
  var reqOpts = {
    method: 'GET',
    url:
      'https://smidgeo.com/wordworker/syllables?text=' +
      encodeURIComponent(text),
    json: true,
    headers: {
      Authorization: 'Key ' + wordworkerKey
    }
  };
  request(reqOpts, bodyMover(done));
}

function singIt({ syllablesGroupedByWord }, done) {
  if (synth.speaking) {
    done(new Error('speechSynthesis.speaking'));
    return;
  }
  if (
    !syllablesGroupedByWord.wordGuesses ||
    syllablesGroupedByWord.wordGuesses.length < 1
  ) {
    done(new Error('Could not get syllables.'));
    return;
  }

  // Since SSML is not implemented on browsers, we can't
  // use the IPA or Arpabet representation of the syllables.
  // Instead, we have to use whole words that sound sort
  // of like each syllable.
  syllablesGroupedByWord.wordGuesses
    .map(guesses => guesses[0])
    .forEach(queueSyllable);

  function queueSyllable(wordApproximation, i) {
    setTimeout(callSpeak, i * 500);
    function callSpeak() {
      speakSyllable({ wordApproximation, pitch: getPitchForSequence(i) });
    }
  }
}

function getPitchForSequence(i) {
  return pitches[i];
}

function speakSyllable({ wordApproximation, pitch }) {
  console.log('speaking syllable:', wordApproximation);
  var utterThis = new SpeechSynthesisUtterance(wordApproximation);
  utterThis.onend = onEnd;
  utterThis.onerror = onError;
  console.log(synth.getVoices());
  utterThis.voice = findWhere(synth.getVoices(), { lang: 'en-US' });
  utterThis.pitch = pitch;
  //utterThis.rate = rate.value;
  synth.speak(utterThis);

  function onEnd() {
    //done();
    console.log('Done speaking', wordApproximation);
  }

  function onError(e) {
    console.log('onError', e);
    //done(new Error('SpeechSynthesisUtterance.onerror'));
  }
}

module.exports = sharkifyFlow;
