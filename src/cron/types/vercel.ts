export interface VercelCronProviderOptions {
  name: 'vercel'
  token: string
  projectId: string
  teamId?: string
  apiUrl?: string
}

export interface VercelCronNamespace {
  readonly projectId: string
}
