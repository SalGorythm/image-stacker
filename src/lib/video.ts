/**
 * Makes an MP4 (H.264, plays in WhatsApp and on every phone) from drawn frames. Uses the browser's
 * own video encoder (WebCodecs) to encode faster than real time; where that's missing, records the
 * animation as it plays (MediaRecorder), which takes as long as the video and may give WebM.
 */
export async function makeVideo(
  w: number,
  h: number,
  seconds: number,
  draw: (x: CanvasRenderingContext2D, t: number) => void,
  progress?: (p: number) => void,
  fps = 30,
): Promise<Blob> {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d')!;
  const frames = Math.round(seconds * fps);

  const codec = await pickCodec(w, h, fps);
  if (codec) {
    const { Muxer, ArrayBufferTarget } = await import('mp4-muxer');
    const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: 'avc', width: w, height: h }, fastStart: 'in-memory' });
    let failure: unknown = null;
    const enc = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: e => { failure = e; } });
    enc.configure({ codec, width: w, height: h, bitrate: Math.round(w * h * fps * 0.12), framerate: fps });
    for (let i = 0; i < frames; i++) {
      draw(x, i / fps);
      const frame = new VideoFrame(c, { timestamp: Math.round((i * 1e6) / fps), duration: Math.round(1e6 / fps) });
      enc.encode(frame, { keyFrame: i % (fps * 2) === 0 });
      frame.close();
      if (failure) throw failure;
      // Let the encoder catch up when its queue grows, and report progress now and then
      while (enc.encodeQueueSize > 12) await new Promise(r => setTimeout(r, 4));
      if (i % 15 === 0) { progress?.(i / frames); await new Promise(r => setTimeout(r, 0)); }
    }
    await enc.flush();
    enc.close();
    muxer.finalize();
    progress?.(1);
    return new Blob([muxer.target.buffer], { type: 'video/mp4' });
  }
  return record(c, x, seconds, draw, fps, progress);
}

/** An H.264 profile this browser can encode at this size: High, then Main, then Baseline, at level 4.2. */
async function pickCodec(w: number, h: number, fps: number) {
  if (typeof VideoEncoder === 'undefined') return null;
  for (const codec of ['avc1.64002a', 'avc1.4d002a', 'avc1.42002a']) {
    try {
      const r = await VideoEncoder.isConfigSupported({ codec, width: w, height: h, framerate: fps, bitrate: 4e6 });
      if (r.supported) return codec;
    } catch { /* try the next */ }
  }
  return null;
}

/** Real-time fallback: draw each frame on schedule while MediaRecorder records the canvas. */
function record(c: HTMLCanvasElement, x: CanvasRenderingContext2D, seconds: number, draw: (x: CanvasRenderingContext2D, t: number) => void, fps: number, progress?: (p: number) => void) {
  const type = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find(t => MediaRecorder.isTypeSupported(t)) ?? '';
  const rec = new MediaRecorder(c.captureStream(fps), type ? { mimeType: type, videoBitsPerSecond: 5e6 } : undefined);
  const parts: Blob[] = [];
  rec.ondataavailable = e => { if (e.data.size) parts.push(e.data); };
  return new Promise<Blob>(resolve => {
    rec.onstop = () => resolve(new Blob(parts, { type: type.split(';')[0] || 'video/webm' }));
    const start = performance.now();
    draw(x, 0);
    rec.start();
    const tick = () => {
      const t = (performance.now() - start) / 1000;
      if (t >= seconds) { rec.stop(); progress?.(1); return; }
      draw(x, t);
      progress?.(t / seconds);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/** Draws a photo filling the frame (cover), or whole (contain) over a blurred, darkened copy of itself. */
export function drawPhoto(x: CanvasRenderingContext2D, img: HTMLImageElement | HTMLCanvasElement, W: number, H: number, fit: 'cover' | 'contain', zoom = 1) {
  const iw = img instanceof HTMLImageElement ? img.naturalWidth : img.width;
  const ih = img instanceof HTMLImageElement ? img.naturalHeight : img.height;
  const cover = Math.max(W / iw, H / ih);
  if (fit === 'contain') {
    // Soft background: a tiny copy scaled up is a cheap blur that works in every browser
    const s = document.createElement('canvas');
    s.width = 24; s.height = Math.max(1, Math.round((24 * H) / W));
    const sx = s.getContext('2d')!;
    sx.drawImage(img, (iw - W / cover) / 2, (ih - H / cover) / 2, W / cover, H / cover, 0, 0, s.width, s.height);
    x.imageSmoothingQuality = 'high';
    x.drawImage(s, 0, 0, W, H);
    x.fillStyle = 'rgba(0,0,0,.35)';
    x.fillRect(0, 0, W, H);
  }
  const k = (fit === 'cover' ? cover : Math.min(W / iw, H / ih)) * zoom;
  x.drawImage(img, (W - iw * k) / 2, (H - ih * k) / 2, iw * k, ih * k);
}
