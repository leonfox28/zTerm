import { useWorkbenchStore } from '../../stores/workbench.store'
import { useUpdateStore } from '../../stores/update.store'

function getUpdateStatusItem(status: ReturnType<typeof useUpdateStore.getState>['state']) {
  switch (status.status) {
    case 'checking':
      return { icon: 'codicon-sync', label: 'Checking updates' }
    case 'available':
      return { icon: 'codicon-cloud-download', label: 'Update available' }
    case 'downloading':
      return {
        icon: 'codicon-sync',
        label: `Downloading update ${Math.round(status.progress?.percent ?? 0)}%`
      }
    case 'downloaded':
      return { icon: 'codicon-arrow-up', label: 'Restart to update' }
    case 'error':
      return { icon: 'codicon-error', label: 'Update error' }
    default:
      return null
  }
}

export function StatusBar() {
  const statusMessage = useWorkbenchStore((state) => state.statusMessage)
  const updateState = useUpdateStore((state) => state.state)
  const updateStatusItem = getUpdateStatusItem(updateState)

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
        {updateStatusItem ? (
          <div className="statusbar__item">
            <i className={`codicon ${updateStatusItem.icon}`} />
            <span>{updateStatusItem.label}</span>
          </div>
        ) : null}
        <div className="statusbar__item">
          <span>UTF-8</span>
        </div>
      </div>
    </div>
  )
}
