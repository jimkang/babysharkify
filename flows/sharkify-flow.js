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

var textField = document.getElementById('text-field');

//const beatLength = 500;
// Warning: This needs to be updated every time playDefs is updated.
//const totalSequenceLength = 7 * beatLength;

const d = 1.0; // I have no idea what this pitch actually is.
const e = 1 + 2.0 / 7;
const g = 1 + 5.0 / 7;
const fSharp = 1 + 4.0 / 7;

var riffA = [
  { pitch: d, duration: 1 },
  { pitch: e, duration: 1 },
  { pitch: g, duration: 0.5 },
  { pitch: g, duration: 0.5 },
  { pitch: g, duration: 0.67 },
  { pitch: g, duration: 0.33 },
  { pitch: g, duration: 0.67 },
  { pitch: g, duration: 0.33 },
  { pitch: g, duration: 1 }
];

var riffB = [
  { pitch: g, duration: 0.5 },
  { pitch: g, duration: 0.5 },
  { pitch: fSharp, duration: 3 }
];

function sharkifyFlow({ text }) {
  textField.value = text;

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
  var wordGuesses = syllablesGroupedByWord.wordGuesses.map(guesses =>
    guesses[0].toLowerCase()
  );
  var nextScheduleTime = 0.0;
  var riffAWithWords = riffA.map(
    curry(addWord)(padWithDoos(wordGuesses, riffA.length))
  );
  var riffBWithWords = riffB.map(
    curry(addWord)(padWithDoos(wordGuesses, riffB.length))
  );
  var playDefs = riffAWithWords
    .concat(riffAWithWords)
    .concat(riffAWithWords)
    .concat(riffBWithWords);

  var voice = findWhere(synth.getVoices(), { lang: 'en-US' });
  playDefs.forEach(queueMusicEvent);

  function queueMusicEvent({ pitch, duration, word }) {
    setTimeout(callSpeak, nextScheduleTime);
    nextScheduleTime += duration;
    function callSpeak() {
      speakSyllable({ word, pitch, voice, duration });
    }
  }
}

function speakSyllable({ word, pitch, voice, duration }) {
  var utterThis = new SpeechSynthesisUtterance(word);
  utterThis.onend = onEnd;
  utterThis.onerror = onError;
  utterThis.voice = voice;
  utterThis.pitch = pitch;
  utterThis.rate = 1 / duration;
  synth.speak(utterThis);

  function onEnd() {
    //done();
  }

  function onError(e) {
    console.log('onError', e);
    //done(new Error('SpeechSynthesisUtterance.onerror'));
  }
}

function padWithDoos(words, desiredLength) {
  const numberOfDoosNeeded = desiredLength - words.length;
  for (var i = 0; i < numberOfDoosNeeded; ++i) {
    words.push('doo');
  }
  return words;
}

function addWord(words, musicEvent, i) {
  return Object.assign({}, musicEvent, { word: words[i] });
}

module.exports = sharkifyFlow;
