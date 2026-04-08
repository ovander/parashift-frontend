import { ref, type Ref } from 'vue'

export type DirtyState = 'clean' | 'dirty' | 'error' | 'saving'

export interface DirtyStateHandle {
  state: Ref<DirtyState>
  isDirty: Ref<boolean>
  hasError: Ref<boolean>
  isSaving: Ref<boolean>
  errorMessage: Ref<string>
  markDirty(): void
  markSaving(): void
  markClean(): void
  markError(message?: string): void
  reset(): void
}

const stateRegistry = new Map<string, Ref<DirtyState>>()
const errorRegistry = new Map<string, Ref<string>>()

export function getDirtyModules(): string[] {
  const dirty: string[] = []
  stateRegistry.forEach((state, key) => {
    if (state.value === 'dirty' || state.value === 'error') dirty.push(key)
  })
  return dirty
}

export function useDirtyState(moduleKey: string): DirtyStateHandle {
  if (!stateRegistry.has(moduleKey)) {
    stateRegistry.set(moduleKey, ref<DirtyState>('clean'))
    errorRegistry.set(moduleKey, ref<string>(''))
  }
  const state        = stateRegistry.get(moduleKey)!
  const errorMessage = errorRegistry.get(moduleKey)!

  const isDirty  = ref(false)
  const hasError = ref(false)
  const isSaving = ref(false)

  function syncDerived() {
    isDirty.value  = state.value === 'dirty'
    hasError.value = state.value === 'error'
    isSaving.value = state.value === 'saving'
  }

  function markDirty() {
    if (state.value === 'saving') return
    state.value = 'dirty'
    errorMessage.value = ''
    syncDerived()
  }
  function markSaving() {
    state.value = 'saving'
    errorMessage.value = ''
    syncDerived()
  }
  function markClean() {
    state.value = 'clean'
    errorMessage.value = ''
    syncDerived()
  }
  function markError(message = 'Changes not saved — please retry.') {
    state.value = 'error'
    errorMessage.value = message
    syncDerived()
  }
  function reset() {
    state.value = 'clean'
    errorMessage.value = ''
    syncDerived()
  }

  syncDerived()

  const handle = Object.create(null)
  handle.state = state
  handle.isDirty = isDirty
  handle.hasError = hasError
  handle.isSaving = isSaving
  handle.errorMessage = errorMessage
  handle.markDirty = markDirty
  handle.markSaving = markSaving
  handle.markClean = markClean
  handle.markError = markError
  handle.reset = reset
  return handle as DirtyStateHandle
}
