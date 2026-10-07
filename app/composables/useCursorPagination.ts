import type { ApiResponse } from '~/types'

/**
 * Paginación server-side por cursor (DynamoDB no soporta "ir a la página N" directo, solo
 * "traer la siguiente página a partir de este cursor"). Por eso la navegación es
 * Anterior/Siguiente, no números de página: se guarda el historial de cursores ya visitados
 * para que "Anterior" sea instantáneo (sin otro pedido al backend) y "Siguiente" siempre pida
 * una página nueva.
 *
 * Incluye un campo de búsqueda opcional (debounced): cambiarlo reinicia a la primera página.
 */
export function useCursorPagination<T>(
  fetchPage: (cursor: string | null, search: string | null) => Promise<ApiResponse<T[]>>
) {
  const toast = useToast()
  const items = ref<T[]>([]) as Ref<T[]>
  const loading = ref(false)
  const error = ref<string | null>(null)
  const nextCursor = ref<string | null>(null)
  const search = ref('')

  const cursorHistory = ref<(string | null)[]>([null])
  const pageIndex = ref(0)

  const hasPrevious = computed(() => pageIndex.value > 0)
  const hasNext = computed(() => nextCursor.value !== null)

  async function loadPage(cursor: string | null) {
    loading.value = true
    error.value = null
    try {
      const res = await fetchPage(cursor, search.value.trim() || null)
      items.value = res.data ?? []
      nextCursor.value = res.next_cursor ?? null
    } catch (e: unknown) {
      error.value = (e as Error).message
      toast.add({ title: 'Error', description: error.value, color: 'error' })
    } finally {
      loading.value = false
    }
  }

  async function reset() {
    cursorHistory.value = [null]
    pageIndex.value = 0
    await loadPage(null)
  }

  async function next() {
    if (!hasNext.value) return
    const cursor = nextCursor.value
    if (cursorHistory.value.length === pageIndex.value + 1) {
      cursorHistory.value.push(cursor)
    }
    pageIndex.value++
    await loadPage(cursor)
  }

  async function previous() {
    if (!hasPrevious.value) return
    pageIndex.value--
    await loadPage(cursorHistory.value[pageIndex.value] ?? null)
  }

  let debounceTimer: ReturnType<typeof setTimeout> | undefined
  watch(search, () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => { reset() }, 350)
  })

  return { items, loading, error, hasNext, hasPrevious, search, reset, next, previous }
}
