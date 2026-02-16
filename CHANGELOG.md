# Changelog

## 0.1.0

- refactor: consolidate Netlify structural typing and send helpers into shared internal modules
- refactor: unify optional provider loading through shared dynamic import utility
- refactor: reduce entrypoint type export boilerplate with `export type *` where supported
- cleanup: remove optional dependency ambient shim files from `src/*/optional-deps.d.ts`
- cleanup: remove low-signal section-marker comments in sandbox type and adapter files
- types: switch `MaybePromise` definitions to `type-fest` `Promisable`
- breaking: rename duplicated Netlify client aliases to module-specific names:
  `NetlifyJobsAsyncWorkloadsClient`, `NetlifyJobsClientConstructorOptions`,
  `NetlifyQueueAsyncWorkloadsClient`, `NetlifyQueueClientConstructorOptions`
