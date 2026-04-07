import { ref, readonly } from 'vue'

export type DirtyState = 'clean' | 'dirty' | 'error' | 'saving'

export interface DirtyStateHandle {
  readonly state: Readonly<ReturnType<typeof ref<DirtyState>>>
  readonly isDirty: Readonly<ReturnType<typeof ref<boolean>>>
  readonly hasError: Readonly<ReturnType<typeof ref<boolean>>>
  readonly isSaving: Readonly<ReturnType<typeof ref<boolean>>>
  readonly errorMessage: Readonly<ReturnType<typeof ref<string>>>
  markDirty(): void
  markSaving(): void
  markClean(): void
  markError(message?: string): void
  reset(): void
}

const stateRegistry = new Map<string, ReturnType<typeof ref<DirtyState>>>()
const errorRegistry = new Map<string, ReturnType<typeof ref<string>>>()

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

  return {
    state: readonly(state),
    isDirty: readonly(isDirty),
    hasError: readonly(hasError),
    isSaving: readonly(isSaving),
    errorMessage: readonly(errorMessage),
    markDirty, markSaving, markClean, markError, reset,
  }
}
