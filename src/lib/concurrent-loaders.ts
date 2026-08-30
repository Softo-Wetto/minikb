type Loader = () => unknown;

export type SettledLoaderResults<T extends readonly Loader[]> = {
  -readonly [K in keyof T]: PromiseSettledResult<Awaited<ReturnType<T[K]>>>;
};

export type LoaderResults<T extends readonly Loader[]> = {
  -readonly [K in keyof T]: Awaited<ReturnType<T[K]>>;
};

export function runConcurrent<const T extends readonly Loader[]>(
  loaders: T,
): Promise<LoaderResults<T>> {
  const pending = loaders.map((loader) => Promise.resolve().then(loader));
  return Promise.all(pending) as Promise<LoaderResults<T>>;
}

export function settleConcurrent<const T extends readonly Loader[]>(
  loaders: T,
): Promise<SettledLoaderResults<T>> {
  const pending = loaders.map((loader) => Promise.resolve().then(loader));
  return Promise.allSettled(pending) as Promise<SettledLoaderResults<T>>;
}
