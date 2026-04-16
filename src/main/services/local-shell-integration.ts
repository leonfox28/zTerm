import os from 'os'
import path from 'path'
import { promises as fs } from 'fs'

const bashIntegrationScript = [
  "if [ -n \"${ZTERM_SHELL_INTEGRATION:-}\" ]; then",
  '  builtin return',
  'fi',
  '',
  'ZTERM_SHELL_INTEGRATION=1',
  '',
  'if [ -r ~/.bashrc ]; then',
  '  . ~/.bashrc',
  'fi',
  '',
  '__zterm_escape_value() {',
  '  builtin local out',
  '  out=${1//\\/\\\\}',
  '  out=${out//;/\\x3b}',
  "  builtin printf '%s\\n' \"$out\"",
  '}',
  '',
  '__zterm_update_cwd() {',
  "  builtin printf '\\e]633;P;Cwd=%s\\a' \"$(__zterm_escape_value \"${PWD}\")\"",
  '}',
  '',
  'PROMPT_COMMAND="__zterm_update_cwd${PROMPT_COMMAND:+;$PROMPT_COMMAND}"',
  '__zterm_update_cwd'
].join('\n')

const zshIntegrationScript = [
  'builtin autoload -Uz add-zsh-hook 2>/dev/null',
  '',
  'if [ -n "$ZTERM_SHELL_INTEGRATION" ]; then',
  '  ZDOTDIR=$USER_ZDOTDIR',
  '  builtin return',
  'fi',
  '',
  'ZTERM_SHELL_INTEGRATION=1',
  '',
  'if [[ "$USER_ZDOTDIR" != "$ZDOTDIR" ]] && [[ -f "$USER_ZDOTDIR/.zshrc" ]]; then',
  '  . "$USER_ZDOTDIR/.zshrc"',
  'fi',
  '',
  'if [[ "$USER_ZDOTDIR" != "$ZDOTDIR" ]]; then',
  '  HISTFILE=$USER_ZDOTDIR/.zsh_history',
  'fi',
  '',
  '__zterm_escape_value() {',
  '  builtin emulate -L zsh',
  '  builtin local out="$1"',
  '  out=${out//\\/\\\\}',
  '  out=${out//;/\\x3b}',
  '  builtin print -r -- "$out"',
  '}',
  '',
  '__zterm_update_cwd() {',
  "  builtin printf '\\e]633;P;Cwd=%s\\a' \"$(__zterm_escape_value \"${PWD}\")\"",
  '}',
  '',
  'add-zsh-hook chpwd __zterm_update_cwd 2>/dev/null',
  'precmd_functions=(__zterm_update_cwd $precmd_functions)',
  '__zterm_update_cwd'
].join('\n')

interface LocalShellIntegrationConfig {
  shell: string
  args: string[]
  env: Record<string, string>
  cleanupPath: string | null
}

export async function createLocalShellLaunchConfig(shellPath: string, loginShell: boolean): Promise<LocalShellIntegrationConfig> {
  const shellName = path.basename(shellPath)
  const tmpdir = await fs.mkdtemp(path.join(os.tmpdir(), 'zterm-shell-'))

  if (shellName === 'bash') {
    const initFilePath = path.join(tmpdir, '.zterm-bashrc')
    await fs.writeFile(initFilePath, bashIntegrationScript, 'utf8')

    return {
      shell: shellPath,
      args: loginShell ? ['--init-file', initFilePath, '-i', '-l'] : ['--init-file', initFilePath, '-i'],
      env: {},
      cleanupPath: tmpdir
    }
  }

  if (shellName === 'zsh') {
    const zshDir = path.join(tmpdir, 'zsh')
    await fs.mkdir(zshDir, { recursive: true })
    await fs.writeFile(path.join(zshDir, '.zshrc'), zshIntegrationScript, 'utf8')

    return {
      shell: shellPath,
      args: loginShell ? ['-i', '-l'] : ['-i'],
      env: {
        ZDOTDIR: zshDir,
        USER_ZDOTDIR: process.env.ZDOTDIR || process.env.HOME || ''
      },
      cleanupPath: tmpdir
    }
  }

  await fs.rm(tmpdir, { recursive: true, force: true })
  return {
    shell: shellPath,
    args: loginShell ? ['-l'] : [],
    env: {},
    cleanupPath: null
  }
}
