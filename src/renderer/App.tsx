import { useEffect } from 'react'
import { Workbench } from './components/workbench/Workbench'
import { useWorkbenchKeybindings } from './keybindings/useWorkbenchKeybindings'
import { useNativeContextMenu } from './utils/context-menu'
import { useConnectionsStore } from './stores/connections.store'
import { useSettingsStore } from './stores/settings.store'
import { useUpdateStore } from './stores/update.store'

function App() {
  const initConnections = useConnectionsStore((s) => s.init)
  const initSettings = useSettingsStore((s) => s.init)
  const initUpdates = useUpdateStore((s) => s.init)

  useWorkbenchKeybindings()
  useNativeContextMenu()

  useEffect(() => {
    void initConnections()
    void initSettings()
    void initUpdates()
  }, [initConnections, initSettings, initUpdates])

  return <Workbench />
}

export default App
