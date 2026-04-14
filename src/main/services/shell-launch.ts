import { SHELL_DEFAULTS } from '@shared/config/shell.config'
import { type IShellOptions } from '@shared/types/terminal'

interface ShellLaunchConfig {
  shell: string
  args: string[]
}

export function resolveShellLaunch(
  options: Pick<IShellOptions, 'shell' | 'loginShell'>,
  getDefaultShell: () => string
): ShellLaunchConfig {
  const shell = options.shell?.trim() || getDefaultShell()
  const loginShell = options.loginShell ?? SHELL_DEFAULTS.loginShell
  const args = process.platform === 'win32' || !loginShell ? [] : ['-l']

  return { shell, args }
}
