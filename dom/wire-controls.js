var dootButton = document.getElementById('doot-button');
var textField = document.getElementById('text-field');

function wireControls({ onSharkify }) {
  dootButton.removeEventListener('click', onButtonClick);
  dootButton.addEventListener('click', onButtonClick);

  function onButtonClick() {
    onSharkify({ text: textField.value });
  }
}

module.exports = wireControls;
