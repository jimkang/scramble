import './app.css';
import { URLStore } from '@jimkang/url-store';
import handleError from 'handle-error-web';
import { version } from './package.json';
import seedrandom from 'seedrandom';
import RandomId from '@jimkang/randomid';
import { createProbable as Probable } from 'probable';
import OLPE from 'one-listener-per-element';
import { getAudioBufferFromFile } from 'synthskel/tasks/get-audio-buffer-from-file';
import { renderResultAudio } from './renderers/render-result-audio';

var randomId = RandomId();
var { on } = OLPE();
var prob: any;
var urlStore: any;
var fileInput: HTMLInputElement = document.getElementById(
  'file'
) as HTMLInputElement;

(async function go() {
  window.onerror = reportTopLevelError;
  renderVersion();

  urlStore = URLStore({
    onUpdate,
    defaults: {
      seed: randomId(8),
      segmentCount: 8,
      scrambleRunCount: 8,
    },
    windowObject: window,
  });
  urlStore.update();
})();

async function onUpdate(
  state: Record<string, unknown>
  //  ephemeralState: Record<string, unknown>
) {
  var random = seedrandom(state.seed);
  prob = Probable({ random });
  prob.roll(2);

  wireControls(
    Object.assign(
      { onFileChange, onSegmentChange, onScrambleChange, onScramble },
      state
    )
  );
}

function wireControls({
  onFileChange,
  onSegmentChange,
  onScrambleChange,
  onScramble,
  segmentCount,
  scrambleRunCount,
}) {
  on('#file', 'change', onFileChange);
}

function onSegmentChange() {}
function onScrambleChange() {}
function onScramble() {}

async function onFileChange() {
  if (!fileInput?.files?.length) {
    return;
  }

  try {
    var audioBuffer = await getAudioBufferFromFile({
      file: fileInput.files[0],
    });

    renderResultAudio({
      audioBuffer,
      containerSelector: '.source-audio-container',
    });
  } catch (error) {
    handleError(error);
  }
}

function reportTopLevelError(
  _msg: any,
  _url: any,
  _lineNo: any,
  _columnNo: any,
  error: any
) {
  handleError(error);
}

function renderVersion() {
  var versionInfo = document.getElementById('version-info') as HTMLElement;
  versionInfo.textContent = version;
}
