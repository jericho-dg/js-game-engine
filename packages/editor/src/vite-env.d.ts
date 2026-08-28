/// <reference types="vite/client" />

declare module '*?raw' {
  const content: string;
  export default content;
}

declare module 'esbuild-wasm/esbuild.wasm?url' {
  const url: string;
  export default url;
}
