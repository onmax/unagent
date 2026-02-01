export interface Provider<T, Input = unknown> {
  id: string
  match: (input: Input) => boolean
  resolve: (input: Input) => Promise<T> | T
  priority?: number
}

export interface Registry<T, Input = unknown> {
  register: (provider: Provider<T, Input>) => void
  unregister: (id: string) => boolean
  resolve: (input: Input) => Promise<T | undefined>
  list: () => Provider<T, Input>[]
}

export interface RegistryOptions {
  defaultPriority?: number
}

export function createRegistry<T, Input = unknown>(options: RegistryOptions = {}): Registry<T, Input> {
  const { defaultPriority = 0 } = options
  const providers: Provider<T, Input>[] = []

  return {
    register(provider) {
      if (provider.priority === undefined)
        provider.priority = defaultPriority
      providers.push(provider)
      providers.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    },

    unregister(id) {
      const idx = providers.findIndex(p => p.id === id)
      if (idx === -1)
        return false
      providers.splice(idx, 1)
      return true
    },

    async resolve(input) {
      for (const provider of providers) {
        if (provider.match(input))
          return await provider.resolve(input)
      }
      return undefined
    },

    list() {
      return [...providers]
    },
  }
}

export function defineProvider<T, Input = unknown>(provider: Provider<T, Input>): Provider<T, Input> {
  return provider
}
