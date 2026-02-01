export interface AgentConfig {
  name: string
  configDir: string
  rulesFile?: string
  skillsDir?: string
  envDetect?: string[]
  description?: string
}

export const agents: Record<string, AgentConfig> = {
  'claude-code': {
    name: 'Claude Code',
    configDir: '~/.claude',
    rulesFile: 'CLAUDE.md',
    skillsDir: 'skills',
    envDetect: ['CLAUDE_CODE', 'CLAUDE_CODE_ENTRY'],
    description: 'Anthropic\'s official CLI for Claude',
  },
  'cursor': {
    name: 'Cursor',
    configDir: '~/.cursor',
    rulesFile: '.cursorrules',
    skillsDir: 'rules',
    envDetect: ['CURSOR_SESSION_ID'],
    description: 'AI-powered code editor',
  },
  'windsurf': {
    name: 'Windsurf',
    configDir: '~/.codeium/windsurf',
    rulesFile: '.windsurfrules',
    skillsDir: 'rules',
    envDetect: ['WINDSURF_SESSION_ID'],
    description: 'Codeium\'s AI code editor',
  },
  'cline': {
    name: 'Cline',
    configDir: '~/.cline',
    rulesFile: '.clinerules',
    skillsDir: 'rules',
    envDetect: ['CLINE_TASK'],
    description: 'VS Code extension for Claude',
  },
  'aider': {
    name: 'Aider',
    configDir: '~/.aider',
    rulesFile: '.aider.conf.yml',
    envDetect: ['AIDER_MODEL'],
    description: 'AI pair programming in terminal',
  },
  'continue': {
    name: 'Continue',
    configDir: '~/.continue',
    rulesFile: 'config.json',
    skillsDir: 'rules',
    envDetect: ['CONTINUE_GLOBAL_DIR'],
    description: 'Open-source AI code assistant',
  },
  'copilot': {
    name: 'GitHub Copilot',
    configDir: '~/.config/github-copilot',
    envDetect: ['GITHUB_COPILOT_TOKEN'],
    description: 'GitHub\'s AI pair programmer',
  },
  'codex': {
    name: 'OpenAI Codex CLI',
    configDir: '~/.codex',
    rulesFile: 'instructions.md',
    envDetect: ['CODEX_HOME'],
    description: 'OpenAI\'s Codex CLI',
  },
  'zed': {
    name: 'Zed',
    configDir: '~/.config/zed',
    rulesFile: 'settings.json',
    envDetect: ['ZED_IMPERSONATE'],
    description: 'High-performance code editor with AI',
  },
  'void': {
    name: 'Void',
    configDir: '~/.void',
    rulesFile: '.voidrules',
    envDetect: ['VOID_EDITOR'],
    description: 'Open-source Cursor alternative',
  },
  'amp': {
    name: 'Amp',
    configDir: '~/.amp',
    rulesFile: 'amp.md',
    skillsDir: 'skills',
    envDetect: ['AMP_SESSION'],
    description: 'Sourcegraph\'s AI coding agent',
  },
  'roo': {
    name: 'Roo Code',
    configDir: '~/.roo',
    rulesFile: '.roorules',
    skillsDir: 'rules',
    envDetect: ['ROO_CODE'],
    description: 'AI coding assistant',
  },
  'avante': {
    name: 'Avante',
    configDir: '~/.config/nvim',
    rulesFile: 'avante.lua',
    envDetect: ['AVANTE_PROVIDER'],
    description: 'Neovim AI plugin',
  },
  'codestory': {
    name: 'CodeStory',
    configDir: '~/.codestory',
    rulesFile: '.codestoryrules',
    envDetect: ['CODESTORY_SESSION'],
    description: 'AI-powered code editor',
  },
  'gpt-engineer': {
    name: 'GPT Engineer',
    configDir: '~/.gpt-engineer',
    rulesFile: 'prompt',
    envDetect: ['GPTE_API_KEY'],
    description: 'AI code generation',
  },
  'sweep': {
    name: 'Sweep',
    configDir: '~/.sweep',
    rulesFile: 'sweep.yaml',
    envDetect: ['SWEEP_API_KEY'],
    description: 'AI junior developer',
  },
  'mentat': {
    name: 'Mentat',
    configDir: '~/.mentat',
    rulesFile: '.mentat_config.json',
    envDetect: ['MENTAT_API_KEY'],
    description: 'AI coding assistant',
  },
  'goose': {
    name: 'Goose',
    configDir: '~/.config/goose',
    rulesFile: 'config.yaml',
    envDetect: ['GOOSE_PROVIDER'],
    description: 'Block\'s AI agent',
  },
  'supermaven': {
    name: 'Supermaven',
    configDir: '~/.supermaven',
    envDetect: ['SUPERMAVEN_API_KEY'],
    description: 'Fast AI code completion',
  },
  'tabnine': {
    name: 'Tabnine',
    configDir: '~/.tabnine',
    envDetect: ['TABNINE_API_KEY'],
    description: 'AI code completion',
  },
  'codeium': {
    name: 'Codeium',
    configDir: '~/.codeium',
    envDetect: ['CODEIUM_API_KEY'],
    description: 'Free AI code completion',
  },
  'sourcegraph-cody': {
    name: 'Sourcegraph Cody',
    configDir: '~/.sourcegraph',
    rulesFile: 'cody.json',
    envDetect: ['SRC_ACCESS_TOKEN'],
    description: 'Sourcegraph\'s AI assistant',
  },
  'amazon-q': {
    name: 'Amazon Q',
    configDir: '~/.aws/amazonq',
    envDetect: ['AMAZON_Q_TOKEN'],
    description: 'AWS AI assistant',
  },
  'gemini-code-assist': {
    name: 'Gemini Code Assist',
    configDir: '~/.config/google-cloud',
    envDetect: ['GOOGLE_APPLICATION_CREDENTIALS'],
    description: 'Google\'s AI coding assistant',
  },
  'replit-agent': {
    name: 'Replit Agent',
    configDir: '~/.replit',
    rulesFile: '.replit',
    envDetect: ['REPL_ID'],
    description: 'Replit\'s AI agent',
  },
  'devin': {
    name: 'Devin',
    configDir: '~/.devin',
    envDetect: ['DEVIN_API_KEY'],
    description: 'Cognition\'s AI software engineer',
  },
  'bolt': {
    name: 'Bolt',
    configDir: '~/.bolt',
    envDetect: ['BOLT_API_KEY'],
    description: 'StackBlitz AI',
  },
  'v0': {
    name: 'v0',
    configDir: '~/.v0',
    envDetect: ['V0_API_KEY'],
    description: 'Vercel\'s AI UI generator',
  },
  'lovable': {
    name: 'Lovable',
    configDir: '~/.lovable',
    envDetect: ['LOVABLE_API_KEY'],
    description: 'AI full-stack developer',
  },
  'pythagora': {
    name: 'Pythagora',
    configDir: '~/.pythagora',
    rulesFile: 'prompts.json',
    envDetect: ['PYTHAGORA_API_KEY'],
    description: 'AI developer',
  },
  'smol-developer': {
    name: 'Smol Developer',
    configDir: '~/.smol',
    rulesFile: 'prompt.md',
    envDetect: ['SMOL_AI_KEY'],
    description: 'AI junior developer',
  },
  'plandex': {
    name: 'Plandex',
    configDir: '~/.plandex',
    rulesFile: 'plandex.yaml',
    envDetect: ['PLANDEX_API_KEY'],
    description: 'AI coding agent for complex tasks',
  },
  'auto-gpt': {
    name: 'Auto-GPT',
    configDir: '~/.auto-gpt',
    rulesFile: 'ai_settings.yaml',
    envDetect: ['AUTO_GPT_KEY'],
    description: 'Autonomous GPT-4 agent',
  },
  'agent-gpt': {
    name: 'AgentGPT',
    configDir: '~/.agent-gpt',
    envDetect: ['AGENT_GPT_KEY'],
    description: 'Browser-based AI agent',
  },
  'babyagi': {
    name: 'BabyAGI',
    configDir: '~/.babyagi',
    envDetect: ['BABY_AGI_KEY'],
    description: 'Task-driven AI agent',
  },
  'langchain-agent': {
    name: 'LangChain Agent',
    configDir: '~/.langchain',
    envDetect: ['LANGCHAIN_API_KEY'],
    description: 'LangChain-based agents',
  },
  'crewai': {
    name: 'CrewAI',
    configDir: '~/.crewai',
    rulesFile: 'agents.yaml',
    envDetect: ['CREWAI_API_KEY'],
    description: 'Multi-agent orchestration',
  },
  'autogen': {
    name: 'AutoGen',
    configDir: '~/.autogen',
    rulesFile: 'OAI_CONFIG_LIST',
    envDetect: ['AUTOGEN_USE_DOCKER'],
    description: 'Microsoft\'s multi-agent framework',
  },
  'chatdev': {
    name: 'ChatDev',
    configDir: '~/.chatdev',
    rulesFile: 'config.yaml',
    envDetect: ['CHATDEV_KEY'],
    description: 'AI software company',
  },
  'metagpt': {
    name: 'MetaGPT',
    configDir: '~/.metagpt',
    rulesFile: 'config2.yaml',
    envDetect: ['METAGPT_KEY'],
    description: 'Multi-agent software company',
  },
  'superagi': {
    name: 'SuperAGI',
    configDir: '~/.superagi',
    envDetect: ['SUPERAGI_KEY'],
    description: 'Open-source AGI framework',
  },
  'jarvis': {
    name: 'Jarvis',
    configDir: '~/.jarvis',
    envDetect: ['JARVIS_API_KEY'],
    description: 'AI assistant',
  },
  'claude-engineer': {
    name: 'Claude Engineer',
    configDir: '~/.claude-engineer',
    rulesFile: 'system_prompt.txt',
    envDetect: ['CLAUDE_ENGINEER'],
    description: 'Claude-based coding assistant',
  },
  'codegeex': {
    name: 'CodeGeeX',
    configDir: '~/.codegeex',
    envDetect: ['CODEGEEX_API_KEY'],
    description: 'AI code assistant',
  },
  'safurai': {
    name: 'Safurai',
    configDir: '~/.safurai',
    envDetect: ['SAFURAI_API_KEY'],
    description: 'AI code assistant',
  },
  'codegpt': {
    name: 'CodeGPT',
    configDir: '~/.codegpt',
    envDetect: ['CODEGPT_API_KEY'],
    description: 'VS Code AI extension',
  },
}

export function getAgentConfig(agentId: string): AgentConfig | undefined {
  return agents[agentId]
}

export function getAgentIds(): string[] {
  return Object.keys(agents)
}

export function getAllAgents(): AgentConfig[] {
  return Object.values(agents)
}
