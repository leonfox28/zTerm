import { TerminalTabs } from '../terminal/TerminalTabs'
import { TerminalPanel } from '../terminal/TerminalPanel'

interface TerminalWorkspaceProps {
  visible: boolean
}

export function TerminalWorkspace({ visible }: TerminalWorkspaceProps) {
  return (
    <div className={`main-area__view ${visible ? '' : 'main-area__view--hidden'}`}>
      <TerminalTabs />
      <TerminalPanel workspaceVisible={visible} />
    </div>
  )
}
