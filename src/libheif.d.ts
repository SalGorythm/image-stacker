// libheif-js ships no types for its ES module bundle; this is the part the app uses.
declare module 'libheif-js/libheif-wasm/libheif-bundle.mjs' {
  interface HeifImage {
    get_width(): number;
    get_height(): number;
    display(target: ImageData, done: (d: ImageData | null) => void): void;
    free?(): void;
  }
  interface LibHeif {
    HeifDecoder: new () => { decode(data: Uint8Array): HeifImage[] };
  }
  const factory: () => LibHeif;
  export default factory;
}
