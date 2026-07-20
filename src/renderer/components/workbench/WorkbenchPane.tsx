import type { ReactNode } from 'react'

interface WorkbenchPaneProps {
  variant: 'primary' | 'auxiliary' | 'embedded'
  title: ReactNode
  headerActions?: ReactNode
  contentClassName?: string
  children: ReactNode
}

export function WorkbenchPane({ variant, title, headerActions, contentClassName, children }: WorkbenchPaneProps) {
  return (
    <div className={`workbench-pane workbench-pane--${variant}`}>
      <div className="workbench-pane__header">
        <span className="workbench-pane__title">{title}</span>
        {headerActions ? <div className="workbench-pane__actions">{headerActions}</div> : null}
      </div>
      <div className={`workbench-pane__content${contentClassName ? ` ${contentClassName}` : ''}`}>{children}</div>
    </div>
  )
}
