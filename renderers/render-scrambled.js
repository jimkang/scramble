import { select } from 'd3-selection';
import toWav from 'audiobuffer-to-wav';

var scrambledList = select('#scrambled-results-list');

export function renderScrambled({ audioBuffers }) {
  var scrItems = scrambledList.selectAll('li').data(audioBuffers);
  scrItems.exit().remove();
  var newScrItems = scrItems.enter().append('li');
  newScrItems
    .append('audio')
    .attr('controls', '')
    .classed('audio-player', true);

  newScrItems
    .merge(scrItems)
    .select('audio')
    .attr('src', getObjectURLForBuffer);
}

function getObjectURLForBuffer(audioBuffer) {
  var blob = new Blob([toWav(audioBuffer)]);
  return URL.createObjectURL(blob);
}
