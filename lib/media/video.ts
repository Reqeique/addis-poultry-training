export const MAX_VIDEO_DURATION_SECONDS = 180;
export const MAX_VIDEO_BYTES = 150 * 1024 * 1024;
const MAX_VIDEO_WIDTH = 1920;
const MAX_VIDEO_HEIGHT = 1080;
const TARGET_VIDEO_BITRATE = 3_500_000;
const TARGET_FPS = 24;

export interface VideoMetadata {
  durationSeconds: number;
  width: number;
  height: number;
}

export interface ProcessedVideoResult {
  file: File;
  metadata: VideoMetadata;
  compressed: boolean;
}

function getSupportedRecorderMimeType() {
  if (typeof MediaRecorder === 'undefined') {
    return null;
  }

  const candidates = [
    'video/mp4;codecs=h264,aac',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];

  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

async function loadVideoElement(file: File) {
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.muted = true;
  video.playsInline = true;
  video.src = objectUrl;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error('Could not read this video file.'));
  });

  return {
    video,
    objectUrl,
    metadata: {
      durationSeconds: Math.ceil(video.duration || 0),
      width: video.videoWidth,
      height: video.videoHeight,
    },
  };
}

function getTargetDimensions(width: number, height: number) {
  const scale = Math.min(MAX_VIDEO_WIDTH / width, MAX_VIDEO_HEIGHT / height, 1);
  return {
    width: Math.max(2, Math.round(width * scale)),
    height: Math.max(2, Math.round(height * scale)),
  };
}

function getFileExtensionFromMimeType(mimeType: string) {
  if (mimeType.includes('mp4')) {
    return 'mp4';
  }

  if (mimeType.includes('webm')) {
    return 'webm';
  }

  return 'bin';
}

function stopMediaTracks(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export async function processVideoForUpload(file: File): Promise<ProcessedVideoResult> {
  if (typeof window === 'undefined') {
    throw new Error('Video processing is only supported in the browser.');
  }

  const supportedMimeType = getSupportedRecorderMimeType();
  if (!supportedMimeType) {
    throw new Error('This browser cannot process video uploads yet.');
  }

  const { video, objectUrl, metadata } = await loadVideoElement(file);

  try {
    if (metadata.durationSeconds > MAX_VIDEO_DURATION_SECONDS) {
      throw new Error('Video must be 3 minutes or shorter.');
    }

    const { width: targetWidth, height: targetHeight } = getTargetDimensions(
      metadata.width,
      metadata.height
    );

    const canKeepOriginalContainer =
      file.type.includes('mp4') || file.type.includes('webm');
    const withinTargetSize =
      file.size <= MAX_VIDEO_BYTES &&
      metadata.width <= MAX_VIDEO_WIDTH &&
      metadata.height <= MAX_VIDEO_HEIGHT;

    if (withinTargetSize && canKeepOriginalContainer) {
      return {
        file,
        metadata,
        compressed: false,
      };
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Could not prepare the video compressor.');
    }

    const canvasStream = canvas.captureStream(TARGET_FPS);
    let sourceStream: MediaStream | null = null;
    let combinedStream: MediaStream | null = null;
    let animationFrameId = 0;
    let recorderStopped = false;

    const chunks: Blob[] = [];

    const drawFrame = () => {
      if (video.paused || video.ended) {
        return;
      }

      context.drawImage(video, 0, 0, targetWidth, targetHeight);
      animationFrameId = window.requestAnimationFrame(drawFrame);
    };

    const streamableVideo = video as HTMLVideoElement & {
      captureStream?: () => MediaStream;
      mozCaptureStream?: () => MediaStream;
    };

    sourceStream =
      typeof streamableVideo.captureStream === 'function'
        ? streamableVideo.captureStream()
        : typeof streamableVideo.mozCaptureStream === 'function'
          ? streamableVideo.mozCaptureStream()
          : null;

    const tracks = [...canvasStream.getVideoTracks()];
    sourceStream?.getAudioTracks().forEach((track) => tracks.push(track));
    combinedStream = new MediaStream(tracks);

    const recorder = new MediaRecorder(combinedStream, {
      mimeType: supportedMimeType,
      videoBitsPerSecond: TARGET_VIDEO_BITRATE,
    });

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    const recorderDone = new Promise<Blob>((resolve, reject) => {
      recorder.onerror = () => reject(new Error('Video compression failed.'));
      recorder.onstop = () => {
        recorderStopped = true;
        resolve(new Blob(chunks, { type: supportedMimeType }));
      };
    });

    recorder.start(250);
    video.currentTime = 0;
    await video.play();
    drawFrame();

    await new Promise<void>((resolve, reject) => {
      video.onended = () => resolve();
      video.onerror = () => reject(new Error('Video playback failed during compression.'));
    });

    window.cancelAnimationFrame(animationFrameId);
    recorder.stop();

    const compressedBlob = await recorderDone;
    const extension = getFileExtensionFromMimeType(supportedMimeType);
    const compressedFile = new File(
      [compressedBlob],
      `${file.name.replace(/\.[^.]+$/, '')}-compressed.${extension}`,
      {
        type: supportedMimeType,
        lastModified: Date.now(),
      }
    );

    if (compressedFile.size > MAX_VIDEO_BYTES) {
      throw new Error('Compressed video is still too large. Please choose a shorter video.');
    }

    return {
      file: compressedFile,
      metadata: {
        durationSeconds: metadata.durationSeconds,
        width: targetWidth,
        height: targetHeight,
      },
      compressed: true,
    };
  } finally {
    stopMediaTracks((video as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.() ?? null);
    URL.revokeObjectURL(objectUrl);
    video.pause();
    video.removeAttribute('src');
    video.load();
  }
}
