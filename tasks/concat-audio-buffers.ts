export function concatAudioBuffers({
  ctx,
  buffers,
  silenceGapLength = 0,
  reverse = true,
}: {
  ctx: AudioContext;
  buffers: AudioBuffer[];
  silenceGapLength: number;
  reverse: boolean;
}): AudioBuffer {
  if (buffers[0].numberOfChannels !== 2) {
    throw new Error('Need to handle buffers that do not have two channels.');
  }

  var srcBuffers = buffers;
  if (reverse) {
    srcBuffers = buffers.toReversed();
  }

  const framesPerGap = ~~(silenceGapLength * srcBuffers[0].sampleRate);

  var totalFrames = 0;
  for (let i = 0; i < srcBuffers.length; ++i) {
    let srcBuffer = srcBuffers[i];
    let leftPCMArray = srcBuffer.getChannelData(0);
    totalFrames += leftPCMArray.length;
  }
  totalFrames += Math.max(srcBuffers.length - 1, 0) * framesPerGap;

  var newLeftArray = new Float32Array(totalFrames);
  var newRightArray = new Float32Array(totalFrames);
  var destIndex = 0;

  for (let i = 0; i < srcBuffers.length; ++i) {
    let srcBuffer = srcBuffers[i];
    let leftPCMArray = srcBuffer.getChannelData(0);
    let rightPCMArray = srcBuffer.getChannelData(1);
    newLeftArray.set(leftPCMArray, destIndex);
    newRightArray.set(rightPCMArray, destIndex);

    destIndex += leftPCMArray.length;
    if (i !== srcBuffers.length - 1) {
      destIndex += framesPerGap;
    }
  }

  var concatBuffer = ctx.createBuffer(2, totalFrames, srcBuffers[0].sampleRate);

  if (typeof concatBuffer.copyToChannel === 'function') {
    concatBuffer.copyToChannel(newLeftArray, 0, 0);
    concatBuffer.copyToChannel(newRightArray, 1, 0);
  } else {
    // TODO: Should swapSegmentsInPCMArrays just use the channel data arrays directly?
    let leftShuffledChannel = concatBuffer.getChannelData(0);
    let rightShuffledChannel = concatBuffer.getChannelData(1);
    for (let i = 0; i < newLeftArray.length; ++i) {
      leftShuffledChannel[i] = newLeftArray[i];
      rightShuffledChannel[i] = newRightArray[i];
    }
  }
  return concatBuffer;
}
