var request = require('basic-browser-request');
var waterfall = require('async-waterfall');
var CollectCtor = require('collect-in-channel');
// TODO: Abstract the three things above.
var curry = require('lodash.curry');
var handleError = require('handle-error-web');
var bodyMover = require('request-body-mover');
var splitToWords = require('split-to-words');
var renderMessage = require('../dom/render-message');

var iscool = require('iscool')({ tragedyHappenedRecently: false });

var config = require('../config');
var synth = window.speechSynthesis;
var statusMessage = document.getElementById('status-message');

const cantDoItMessage =
  "Sorry, I can't figure out how to sing that. Try putting something else in.";

// In milliseconds.
const beatLength = 600;
// The lower the slower.
const rateFactor = 0.99; //1.2;

const d = 1.0; // I have no idea what this pitch actually is.
const e = 1 + 2.0 / 7;
const g = 1 + 5.0 / 7;
const fSharp = 1 + 4.0 / 7;

var riffA1 = [
  { pitch: d, duration: 1 },
  { pitch: e, duration: 1 },
  { pitch: g, duration: 0.5 },
  { pitch: g, duration: 0.5 },
  { pitch: g, duration: 0.5 },
  { pitch: g, duration: 0.25 },
  { pitch: g, duration: 0.5 },
  { pitch: g, duration: 0.25 },
  { pitch: g, duration: 0.5 }
];

var riffA = [
  { pitch: d, duration: 0.5 },
  { pitch: e, duration: 0.5 },
  { pitch: g, duration: 0.5 },
  { pitch: g, duration: 0.5 },
  { pitch: g, duration: 0.5 },
  { pitch: g, duration: 0.25 },
  { pitch: g, duration: 0.5 },
  { pitch: g, duration: 0.25 },
  { pitch: g, duration: 0.5 }
];

var riffB = [
  { pitch: g, duration: 0.5 },
  { pitch: g, duration: 0.5 },
  { pitch: fSharp, duration: 2 }
];

function sharkifyFlow({ text, voice, maxRate }) {
  statusMessage.classList.add('hidden');
  statusMessage.classList.remove('visible');

  var inputWords = splitToWords(text);
  if (!inputWords.every(iscool)) {
    renderMessage({
      targetId: 'status-message',
      message: cantDoItMessage
    });
    return;
  }

  var channel = {
    text,
    wordworkerKey: config.wordworker.key,
    voice,
    maxRate
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

function singIt({ syllablesGroupedByWord, voice, maxRate }, done) {
  if (synth.speaking) {
    done(new Error('speechSynthesis.speaking'));
    return;
  }
  var wordGuesses;
  if (
    syllablesGroupedByWord &&
    syllablesGroupedByWord.wordGuesses &&
    syllablesGroupedByWord.wordGuesses.length > 0
  ) {
    wordGuesses = syllablesGroupedByWord.wordGuesses.map(guesses =>
      guesses[0].toLowerCase()
    );
  }
  if (!wordGuesses) {
    renderMessage({ targetId: 'status-message', message: cantDoItMessage });
    return;
  }

  // Since SSML is not implemented on browsers, we can't
  // use the IPA or Arpabet representation of the syllables.
  // Instead, we have to use whole words that sound sort
  // of like each syllable.
  var nextScheduleTime = 0.0;
  var riffA1WithWords = addWordsToRiff(wordGuesses, riffA1);
  var riffAWithWords = addWordsToRiff(wordGuesses, riffA);
  var riffBWithWords = addWordsToRiff(wordGuesses, riffB);

  var playDefs = riffA1WithWords
    .concat(riffAWithWords)
    .concat(riffAWithWords)
    .concat(riffBWithWords);

  playDefs.forEach(queueMusicEvent);

  function queueMusicEvent({ pitch, duration, word }) {
    setTimeout(callSpeak, nextScheduleTime);
    nextScheduleTime += duration * beatLength;
    function callSpeak() {
      speakSyllable({ word, pitch, voice, duration, maxRate });
    }
  }
}

function speakSyllable({ word, pitch, voice, duration, maxRate }) {
  var utterThis = new SpeechSynthesisUtterance(word);
  utterThis.onend = onEnd;
  utterThis.onerror = onError;
  utterThis.voice = voice;
  utterThis.pitch = pitch;
  // As of 2019-04-18, if you set the rate to over 2.0 on Chrome
  // on Linux, voice synthesis stops working until you restart Chrome.
  utterThis.rate = (1 / duration) * rateFactor;
  if (utterThis.rate > maxRate) {
    utterThis.rate = maxRate;
  }
  console.log('rate', utterThis.rate);
  // Chrome defaults to -1 volume?!
  utterThis.volume = 0.5;
  // On browsers that don't play at rates over 2.0, the
  // syllables will sound out-of-rhythm, so we try to
  // cancel any current talking so we can start the next
  // syllable on time.
  synth.cancel();
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

function addWordsToRiff(wordGuesses, riff) {
  return riff.map(curry(addWord)(padWithDoos(wordGuesses, riff.length)));
}

module.exports = sharkifyFlow;
