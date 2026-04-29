import { create } from 'zustand'
import { type IUpdateState } from '@shared/types/update'

const INITIAL_UPDATE_STATE: IUpdateState = {
  status: 'idle',
  currentVersion: '',
  message: 'Updates are idle.'
}

interface UpdateState {
  state: IUpdateState
  initialized: boolean
  init: () => Promise<void>
  checkForUpdates: () => Promise<IUpdateState>
  installDownloadedUpdate: () => Promise<IUpdateState>
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  state: INITIAL_UPDATE_STATE,
  initialized: false,

  init: async () => {
    if (get().initialized) {
      return
    }

    set({ initialized: true })
    const state = await window.updateApi.getState()
    window.updateApi.onStateChanged((nextState: IUpdateState) => {
      set({ state: nextState })
    })
    set({ state })
  },

  checkForUpdates: async () => {
    const currentState = get().state
    if (currentState.status !== 'checking' && currentState.status !== 'downloading') {
      set({
        state: {
          status: 'checking',
          currentVersion: currentState.currentVersion,
          availableVersion: currentState.availableVersion,
          message: 'Checking for updates...',
          checkedAt: Date.now()
        }
      })
    }

    const state = await window.updateApi.checkForUpdates()
    set({ state })
    return state
  },

  installDownloadedUpdate: async () => {
    const state = await window.updateApi.installDownloadedUpdate()
    set({ state })
    return state
  }
}))
