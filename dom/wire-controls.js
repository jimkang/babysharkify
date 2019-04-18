var d3 = require('d3-selection');
var accessor = require('accessor')();

var dootButton = document.getElementById('doot-button');
var textField = document.getElementById('text-field');
var voiceSelect = d3.select('#voice-select');

var buttonWired = false;

function wireControls({ onSharkify, voices, selectedVoiceName }) {
  if (!buttonWired) {
    buttonWired = true;
    dootButton.addEventListener('click', onButtonClick);
  }

  var voiceNames = voices.map(v => v.name).sort();
  var voiceOptions = voiceSelect
    .selectAll('option')
    .data(voiceNames, accessor('identity'));
  voiceOptions.exit().remove();
  var optionsToUpdate = voiceOptions
    .enter()
    .append('option')
    .merge(voiceOptions);
  optionsToUpdate
    .text(accessor('identity'))
    .attr('value', accessor('identity'));
  optionsToUpdate.each(setSelected);

  function onButtonClick() {
    onSharkify({
      text: textField.value,
      selectedVoiceName: voiceSelect.node().value
    });
  }

  function setSelected(name) {
    var option = this;
    if (name === selectedVoiceName) {
      option.selected = true;
    } else {
      option.removeAttribute('selected');
    }
  }
}

module.exports = wireControls;
