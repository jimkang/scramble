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
import { renderScrambled } from './renderers/render-scrambled';
import { swapSegments } from './tasks/scramble';
import { concatAudioBuffers } from './tasks/concat-audio-buffers';
import ContextKeeper from 'audio-context-singleton';
import { range } from 'd3-array';

var randomId = RandomId();
var { on } = OLPE();
var { getCurrentContext } = ContextKeeper();

// Ephemeral state
var prob: any;
var urlStore: any;
var fileInput: HTMLInputElement = document.getElementById(
  'file'
) as HTMLInputElement;
var segmentInput: HTMLInputElement = document.getElementById(
  'segment-count-field'
) as HTMLInputElement;
var silenceInput: HTMLInputElement = document.getElementById(
  'silence-field'
) as HTMLInputElement;
var srcAudioBuffer;

(async function go() {
  window.onerror = reportTopLevelError;
  renderVersion();

  urlStore = URLStore({
    onUpdate,
    defaults: {
      seed: randomId(8),
      segmentCount: 8,
      silenceSeconds: 8,
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
      { onFileChange, onSegmentChange, onSilenceChange, onScramble },
      state
    )
  );

  async function onScramble() {
    if (!srcAudioBuffer) {
      throw new Error('No source audio to scramble.');
    }

    var ctx = await new Promise((resolve, reject) =>
      getCurrentContext((error, ctx) => (error ? reject(error) : resolve(ctx)))
    );

    var shuffledIndexes = prob.shuffle(range(state.segmentCount));
    var swapPairIndexes = [];
    for (let i = 0; i + 1 < shuffledIndexes.length; i += 2) {
      swapPairIndexes.push([shuffledIndexes[i], shuffledIndexes[i + 1]]);
    }
    swapPairIndexes = prob.shuffle(swapPairIndexes);

    var audioBuffers: AudioBuffer[] = [];

    for (let i = 0; i < swapPairIndexes.length; ++i) {
      let pair = swapPairIndexes[i];
      audioBuffers.push(
        swapSegments({
          ctx,
          srcBuffer:
            audioBuffers.length > 0
              ? audioBuffers[audioBuffers.length - 1]
              : srcAudioBuffer,
          segmentIndexA: pair[0],
          segmentIndexB: pair[1],
          segmentLengthInSeconds: srcAudioBuffer.duration / state.segmentCount,
          fadeInLengthAsSegmentPct: 5,
          fadeOutLengthAsSegmentPct: 5,
        })
      );
    }

    audioBuffers.push(
      concatAudioBuffers({
        ctx,
        buffers: audioBuffers,
        silenceGapLength: state.silenceSeconds as number,
        reverse: true,
      })
    );

    renderScrambled({ audioBuffers });
  }
}

function wireControls({
  onFileChange,
  onSegmentChange,
  onSilenceChange,
  onScramble,
  segmentCount,
  silenceSeconds,
}) {
  segmentInput.value = segmentCount;
  silenceInput.value = silenceSeconds;

  on('#file', 'change', onFileChange);
  on('#segment-count-field', 'change', onSegmentChange);
  on('#silence-field', 'change', onSilenceChange);
  on('#scramble-button', 'click', onScramble);
}

function onSegmentChange() {
  urlStore.update({ segmentCount: +segmentInput.value });
}
function onSilenceChange() {
  urlStore.update({ silenceSeconds: +silenceInput.value });
}

async function onFileChange() {
  if (!fileInput?.files?.length) {
    return;
  }

  try {
    srcAudioBuffer = await getAudioBufferFromFile({
      file: fileInput.files[0],
    });
    // TODO: Impl. urlStore ephemeral state, put it thes.

    renderResultAudio({
      audioBuffer: srcAudioBuffer,
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
