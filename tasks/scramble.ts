import { easeCubicInOut } from 'd3-ease';

export function swapSegments({
  ctx,
  srcBuffer,
  segmentIndexA,
  segmentIndexB,
  segmentLengthInSeconds = 30 / 64,
  fadeInLengthAsSegmentPct,
  fadeOutLengthAsSegmentPct,
}: {
  ctx: AudioContext;
  srcBuffer: AudioBuffer;
  segmentIndexA: number;
  segmentIndexB: number;
  segmentLengthInSeconds: number;
  fadeInLengthAsSegmentPct: number;
  fadeOutLengthAsSegmentPct: number;
}): AudioBuffer {
  const stereo = srcBuffer.numberOfChannels === 2;
  var leftPCMArray = srcBuffer.getChannelData(0);
  var rightPCMArray;
  if (stereo) {
    rightPCMArray = srcBuffer.getChannelData(1);
  }
  var shuffledArrays = swapSegmentsInPCMArrays(
    leftPCMArray,
    rightPCMArray,
    srcBuffer.sampleRate,
    segmentIndexA,
    segmentIndexB,
    segmentLengthInSeconds,
    fadeInLengthAsSegmentPct,
    fadeOutLengthAsSegmentPct
  );

  var shuffledBuffer = ctx.createBuffer(
    stereo ? 2 : 1,
    shuffledArrays[0].length,
    srcBuffer.sampleRate
  );

  if (typeof shuffledBuffer.copyToChannel === 'function') {
    shuffledBuffer.copyToChannel(shuffledArrays[0], 0, 0);
    if (stereo) {
      shuffledBuffer.copyToChannel(shuffledArrays[1], 1, 0);
    }
  } else {
    // TODO: Should swapSegmentsInPCMArrays just use the channel data arrays directly?
    let leftShuffledChannel = shuffledBuffer.getChannelData(0);
    let rightShuffledChannel;
    if (stereo) {
      rightShuffledChannel = shuffledBuffer.getChannelData(1);
    }
    for (let i = 0; i < shuffledArrays[0].length; ++i) {
      leftShuffledChannel[i] = shuffledArrays[0][i];
      if (rightShuffledChannel) {
        rightShuffledChannel[i] = shuffledArrays[1][i];
      }
    }
  }
  return shuffledBuffer;
}

function swapSegmentsInPCMArrays(
  leftPCMArray,
  rightPCMArray,
  sampleRate,
  segmentIndexA,
  segmentIndexB,
  segmentLengthInSeconds,
  fadeInLengthAsSegmentPct,
  fadeOutLengthAsSegmentPct
) {
  var totalFrames = leftPCMArray.length;
  var clipSizeInFrames = ~~(segmentLengthInSeconds * sampleRate);
  var fadeInFrameCount = ~~(
    (clipSizeInFrames * fadeInLengthAsSegmentPct) /
    100
  );
  var fadeOutFrameCount = ~~(
    (clipSizeInFrames * fadeOutLengthAsSegmentPct) /
    100
  );
  //var numberOfSegments = ~~(totalFrames / clipSizeInFrames);
  var newLeftArray = new Float32Array(totalFrames);
  newLeftArray.set(leftPCMArray, 0);
  var newRightArray;

  if (rightPCMArray) {
    newRightArray = new Float32Array(totalFrames);
    newRightArray.set(rightPCMArray, 0);
  }

  var offsetA = segmentIndexA * clipSizeInFrames;
  var offsetB = segmentIndexB * clipSizeInFrames;
  var sourceEndA = offsetA + clipSizeInFrames;
  var sourceEndB = offsetB + clipSizeInFrames;
  var leftClipA = leftPCMArray.subarray(offsetA, sourceEndA);
  var leftClipB = leftPCMArray.subarray(offsetB, sourceEndB);
  var rightClipA;
  var rightClipB;
  if (rightPCMArray) {
    rightClipA = rightPCMArray.subarray(offsetA, sourceEndA);
    rightClipB = rightPCMArray.subarray(offsetB, sourceEndB);
  }

  if (fadeInFrameCount > 0) {
    fadeIn(fadeInFrameCount, leftClipA, rightClipA);
    fadeIn(fadeInFrameCount, leftClipB, rightClipB);
  }
  if (fadeOutFrameCount > 0) {
    fadeOut(fadeOutFrameCount, leftClipA, rightClipA);
    fadeOut(fadeOutFrameCount, leftClipA, rightClipB);
  }

  /*
    console.log('leftClip size:', leftClipA.length);
    console.log(
      'Copying',
      clipSizeInFrames,
      'from',
      sourceOffset,
      'to',
      destOffset
    );
    */
  newLeftArray.set(leftClipA, offsetB);
  newLeftArray.set(leftClipB, offsetA);
  if (newRightArray) {
    newRightArray.set(rightClipA, offsetB);
    newRightArray.set(rightClipB, offsetA);
    return [newLeftArray, newRightArray];
  }

  return [newLeftArray];
}

function fadeIn(length, array0, array1) {
  for (let i = 0; i < length; ++i) {
    let proportion = easeCubicInOut(i / length);
    array0[i] = array0[i] * proportion;
    if (array1) {
      array1[i] = array1[i] * proportion;
    }
  }
}

function fadeOut(length, array0, array1) {
  for (let j = 0; j < length; ++j) {
    let index = array0.length - 1 - j;
    let proportion = easeCubicInOut(j / length);
    array0[index] = array0[index] * proportion;
    if (array1) {
      array1[index] = array1[index] * proportion;
    }
  }
}
