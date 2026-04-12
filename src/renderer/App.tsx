import { useEffect } from 'react'
import { Workbench } from './components/workbench/Workbench'
import { useConnectionsStore } from './stores/connections.store'

function App() {
  const init = useConnectionsStore((s) => s.init)

  useEffect(() => {
    init()
  }, [init])

  return <Workbench />
}

export default App
