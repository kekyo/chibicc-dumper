declare module 'virtual:chibicc-dumper-assets' {
  export interface EmbeddedBuiltinFile {
    readonly content: string;
    readonly mtimeUnixSeconds: number;
  }

  export const wasmBase64: string;
  export const builtinFiles: Readonly<Record<string, EmbeddedBuiltinFile>>;
}
