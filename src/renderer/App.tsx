import { useEffect } from 'react'
import { Workbench } from './components/workbench/Workbench'
import { useConnectionsStore } from './stores/connections.store'
import { useSettingsStore } from './stores/settings.store'

function App() {
  const initConnections = useConnectionsStore((s) => s.init)
  const initSettings = useSettingsStore((s) => s.init)

  useEffect(() => {
    void initConnections()
    void initSettings()
  }, [initConnections, initSettings])

  return <Workbench />
}

export default App
