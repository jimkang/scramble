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
var segmentInput: HTMLInputElement = document.getElementById(
  'segment-count-field'
);
var scrambleCountInput: HTMLInputElement = document.getElementById(
  'scramble-count-field'
);
var scrambleButton = document.getElementById('scramble-button');

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
  segmentInput.value = segmentCount;
  scrambleCountInput.value = scrambleRunCount;

  on('#file', 'change', onFileChange);
  on('#segment-count-field', 'change', onSegmentChange);
  on('#scramble-count-field', 'change', onScrambleChange);
}

function onSegmentChange() {
  urlStore.update({ segmentCount: +segmentInput.value });
}
function onScrambleChange() {
  urlStore.update({ scrambleRunCount: +scrambleCountInput.value });
}

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
