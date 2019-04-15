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

const beatLength = 500;
// Warning: This needs to be updated every time playDefs is updated.
const totalSequenceLength = 7 * beatLength;

var playDefs = [
  { pitch: 0.0, beat: 0 },
  { pitch: 0.5, beat: 1 },
  { pitch: 2.0, beat: 2 },
  { pitch: 2.0, beat: 2.67 },
  { pitch: 2.0, beat: 3 },
  { pitch: 2.0, beat: 3.67 },
  { pitch: 2.0, beat: 4 },
  { pitch: 2.0, beat: 4.67 },
  { pitch: 2.0, beat: 5 },
  { pitch: 2.0, beat: 5.67 },
  { pitch: 2.0, beat: 6 },
  { pitch: 2.0, beat: 6.67 },
  { pitch: 2.0, beat: 7 }
];

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
  var wordGuesses = syllablesGroupedByWord.wordGuesses.map(
    guesses => guesses[0]
  );
  padWithDoos(wordGuesses, playDefs.length).forEach(queueSyllable);

  var voice = findWhere(synth.getVoices(), { lang: 'en-US' });

  function queueSyllable(wordApproximation, i) {
    var { pitch, delay } = playDefs[i % playDefs.length];
    setTimeout(
      callSpeak,
      delay * beatLength + ~~(playDefs.length / i) * totalSequenceLength
    );
    function callSpeak() {
      speakSyllable({ wordApproximation, pitch, voice });
    }
  }
}

function speakSyllable({ wordApproximation, pitch, voice }) {
  console.log('speaking syllable:', wordApproximation);
  var utterThis = new SpeechSynthesisUtterance(wordApproximation);
  utterThis.onend = onEnd;
  utterThis.onerror = onError;
  console.log(synth.getVoices());
  utterThis.voice = voice;
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

function padWithDoos(words, desiredLength) {
  for (var i = 0; i < desiredLength - words.length; ++i) {
    words.push('DOO');
  }
  return words;
}

module.exports = sharkifyFlow;
