import { TerminalTabs } from '../terminal/TerminalTabs'
import { TerminalPanel } from '../terminal/TerminalPanel'

export function MainArea() {
  return (
    <div className="main-area">
      <TerminalTabs />
      <TerminalPanel />
    </div>
  )
}
