var findWhere = require('lodash.findwhere');

var preferredVoiceDescriptors = [
  { name: 'Fiona' },
  { name: 'Daniel' },
  { default: true },
  { lang: 'en-GB' }
];

function getPreferredVoice(voices) {
  var voice;
  preferredVoiceDescriptors.some(findDesc);

  if (!voice || voice.lang === 'en-US') {
    let britishVoice = findWhere(voices, { lang: 'en-GB' });
    if (britishVoice) {
      voice = britishVoice;
    }
  }
  return voice;

  function findDesc(desc) {
    voice = findWhere(voices, desc);
    return voice;
  }
}

module.exports = getPreferredVoice;
