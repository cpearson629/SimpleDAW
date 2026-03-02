import { DAWContext, useDAWReducer } from './store/useDAWStore'
import { useAudioEngine } from './audio/useAudioEngine'
import { useTransport } from './hooks/useTransport'
import { TransportBar } from './components/transport/TransportBar'
import { TrackList } from './components/tracks/TrackList'
import { EditorPanel } from './components/editors/EditorPanel'

function DAWApp() {
  useAudioEngine()
  useTransport()

  return (
    <div className="daw-root">
      <TransportBar />
      <div className="daw-main">
        <TrackList />
        <EditorPanel />
      </div>
    </div>
  )
}

export default function App() {
  const [state, dispatch] = useDAWReducer()

  return (
    <DAWContext.Provider value={{ state, dispatch }}>
      <DAWApp />
    </DAWContext.Provider>
  )
}
