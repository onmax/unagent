export async function dynamicImport<T = unknown>(specifier: string): Promise<T> {
  // Keep optional providers from being eagerly bundled by platform builds.
  return import(
    /* @vite-ignore */
    specifier
  ) as Promise<T>
}
