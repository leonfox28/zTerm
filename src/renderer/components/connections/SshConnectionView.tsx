import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { useConnectionsStore, type ConnectionItem } from '../../stores/connections.store'
import { useWorkbenchStore } from '../../stores/workbench.store'
import '../../styles/settings.css'
import '../../styles/workbench.css'

type AuthType = 'password' | 'privateKey'

interface FormState {
  name: string
  host: string
  port: string
  username: string
  folderId: string
  authType: AuthType
  password: string
  savePassword: boolean
  privateKeyPath: string
  passphrase: string
  savePassphrase: boolean
}

const EMPTY_FORM: FormState = {
  name: '',
  host: '',
  port: '22',
  username: '',
  folderId: '',
  authType: 'password',
  password: '',
  savePassword: true,
  privateKeyPath: '',
  passphrase: '',
  savePassphrase: true
}

function buildFormState(connection: ConnectionItem | null): FormState {
  if (!connection) {
    return EMPTY_FORM
  }

  return {
    name: connection.name,
    host: connection.host ?? '',
    port: String(connection.port ?? 22),
    username: connection.username ?? '',
    folderId: connection.folderId ?? '',
    authType: connection.authType ?? 'password',
    password: '',
    savePassword: Boolean(connection.hasSavedPassword),
    privateKeyPath: connection.privateKeyPath ?? '',
    passphrase: '',
    savePassphrase: Boolean(connection.hasSavedPassphrase)
  }
}

interface SshConnectionFormProps {
  editingConnection: ConnectionItem | null
  folders: ReturnType<typeof useConnectionsStore.getState>['folders']
  saveConnection: ReturnType<typeof useConnectionsStore.getState>['saveConnection']
  onCancel?: () => void
  onSuccess?: () => void
}

export function SshConnectionForm({
  editingConnection,
  folders,
  saveConnection,
  onCancel,
  onSuccess
}: SshConnectionFormProps) {
  const [form, setForm] = useState<FormState>(() => buildFormState(editingConnection))
  const [error, setError] = useState<string | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  const handleTextChange =
    (key: keyof FormState) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = event.target.type === 'checkbox' ? (event.target as HTMLInputElement).checked : event.target.value
      setForm((state) => ({ ...state, [key]: value }))
    }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setWarning(null)

    if (!form.host.trim()) {
      setError('Host is required.')
      return
    }

    if (!form.username.trim()) {
      setError('Username is required.')
      return
    }

    if (form.authType === 'privateKey' && !form.privateKeyPath.trim()) {
      setError('Private key path is required for private key authentication.')
      return
    }

    const port = Number(form.port)
    if (!Number.isInteger(port) || port <= 0) {
      setError('Port must be a positive integer.')
      return
    }

    const result = await saveConnection({
      id: editingConnection?.id,
      name: form.name.trim() || `${form.username}@${form.host}`,
      folderId: form.folderId || undefined,
      host: form.host.trim(),
      port,
      username: form.username.trim(),
      authType: form.authType,
      password: form.authType === 'password' ? form.password : undefined,
      savePassword: form.authType === 'password' && form.savePassword,
      privateKeyPath: form.authType === 'privateKey' ? form.privateKeyPath.trim() : undefined,
      passphrase: form.authType === 'privateKey' ? form.passphrase : undefined,
      savePassphrase: form.authType === 'privateKey' && form.savePassphrase
    })

    if (result.warning) {
      setWarning(result.warning)
      return
    }

    onSuccess?.()
  }

  return (
    <form className="settings-section" onSubmit={handleSubmit}>
      <h2 className="settings-section__title">Connection</h2>
      <div className="settings-field-grid">
        <label className="settings-field">
          <span className="settings-field__label">Name</span>
          <input className="settings-field__input" onChange={handleTextChange('name')} type="text" value={form.name} />
        </label>

        <label className="settings-field">
          <span className="settings-field__label">Folder</span>
          <select className="settings-field__select" onChange={handleTextChange('folderId')} value={form.folderId}>
            <option value="">Root</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </label>

        <label className="settings-field settings-field--full">
          <span className="settings-field__label">Host</span>
          <input className="settings-field__input" onChange={handleTextChange('host')} type="text" value={form.host} />
        </label>

        <label className="settings-field">
          <span className="settings-field__label">Port</span>
          <input className="settings-field__input" onChange={handleTextChange('port')} type="number" value={form.port} />
        </label>

        <label className="settings-field">
          <span className="settings-field__label">Username</span>
          <input className="settings-field__input" onChange={handleTextChange('username')} type="text" value={form.username} />
        </label>

        <label className="settings-field settings-field--full">
          <span className="settings-field__label">Authentication</span>
          <select className="settings-field__select" onChange={handleTextChange('authType')} value={form.authType}>
            <option value="password">Password</option>
            <option value="privateKey">Private Key</option>
          </select>
        </label>

        {form.authType === 'password' ? (
          <>
            <label className="settings-field settings-field--full">
              <span className="settings-field__label">Password</span>
              <input className="settings-field__input" onChange={handleTextChange('password')} type="password" value={form.password} />
            </label>
            <label className="settings-field settings-field--toggle">
              <span>
                <span className="settings-field__label">Save Password</span>
                <span className="settings-field__hint">Uses secure platform credential storage when available.</span>
              </span>
              <input checked={form.savePassword} onChange={handleTextChange('savePassword')} type="checkbox" />
            </label>
          </>
        ) : (
          <>
            <label className="settings-field settings-field--full">
              <span className="settings-field__label">Private Key Path</span>
              <input className="settings-field__input" onChange={handleTextChange('privateKeyPath')} type="text" value={form.privateKeyPath} />
            </label>
            <label className="settings-field settings-field--full">
              <span className="settings-field__label">Passphrase</span>
              <input className="settings-field__input" onChange={handleTextChange('passphrase')} type="password" value={form.passphrase} />
            </label>
            <label className="settings-field settings-field--toggle">
              <span>
                <span className="settings-field__label">Save Passphrase</span>
                <span className="settings-field__hint">Uses secure platform credential storage when available.</span>
              </span>
              <input checked={form.savePassphrase} onChange={handleTextChange('savePassphrase')} type="checkbox" />
            </label>
          </>
        )}
      </div>

      {error && <p className="settings-view__description">{error}</p>}
      {warning && <p className="settings-view__description">{warning}</p>}

      <div className="settings-view__header">
        <div />
        <div className="workbench-dialog__actions">
          <button className="settings-view__button" onClick={onCancel} type="button">
            Cancel
          </button>
          <button className="settings-view__button" type="submit">
            {editingConnection ? 'Save Connection' : 'Create Connection'}
          </button>
        </div>
      </div>
    </form>
  )
}

export function SshConnectionDialog() {
  const { folders, connections, saveConnection } = useConnectionsStore()
  const { connectionDialogOpen, editingConnectionId, closeConnectionDialog } = useWorkbenchStore()
  const editingConnection = useMemo(
    () => connections.find((connection) => connection.id === editingConnectionId) ?? null,
    [connections, editingConnectionId]
  )
  const formKey = editingConnection?.id ?? 'new'

  useEffect(() => {
    if (!connectionDialogOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeConnectionDialog()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [closeConnectionDialog, connectionDialogOpen])

  if (!connectionDialogOpen) {
    return null
  }

  return (
    <div className="workbench-dialog" onMouseDown={closeConnectionDialog}>
      <div
        aria-modal="true"
        className="workbench-dialog__panel"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="settings-view">
          <div className="settings-view__header">
            <div>
              <h1 className="settings-view__title">{editingConnection ? 'Edit SSH Connection' : 'New SSH Connection'}</h1>
              <p className="settings-view__description">Create and manage saved SSH connections for the sidebar.</p>
            </div>
          </div>

          <SshConnectionForm
            key={formKey}
            editingConnection={editingConnection}
            folders={folders}
            onCancel={closeConnectionDialog}
            onSuccess={closeConnectionDialog}
            saveConnection={saveConnection}
          />
        </div>
      </div>
    </div>
  )
}
