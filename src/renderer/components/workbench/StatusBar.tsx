import { useWorkbenchStore } from '../../stores/workbench.store'

export function StatusBar() {
  const statusMessage = useWorkbenchStore((state) => state.statusMessage)

  return (
    <div className="statusbar">
      <div className="statusbar__left">
        <div className="statusbar__item">
          <i className="codicon codicon-terminal" />
          <span>zsh</span>
        </div>
        {statusMessage ? (
          <div className="statusbar__item statusbar__item--message statusbar__item--error">
            <i className="codicon codicon-error" />
            <span>{statusMessage}</span>
          </div>
        ) : null}
      </div>
      <div className="statusbar__right">
        <div className="statusbar__item">
          <span>UTF-8</span>
        </div>
      </div>
    </div>
  )
}
