var listenersInit = false;

var sillyNameButton = document.getElementById('silly-name-button');

function wireControls({ makeSillyName }) {
  if (listenersInit) {
    return;
  }
  listenersInit = true;

  sillyNameButton.addEventListener('click', makeSillyName);
}

module.exports = wireControls;
