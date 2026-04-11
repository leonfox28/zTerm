export function StatusBar() {
  return (
    <div className="statusbar">
      <div className="statusbar__left">
        <div className="statusbar__item">
          <i className="codicon codicon-terminal" />
          <span>zsh</span>
        </div>
      </div>
      <div className="statusbar__right">
        <div className="statusbar__item">
          <span>UTF-8</span>
        </div>
      </div>
    </div>
  )
}
