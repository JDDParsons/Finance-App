// Shared singleton so AllocationPieChart and Summary can stay in sync
const highlightedIndex = ref<number | null>(null)

export function useAllocationHighlight() {
  return { highlightedIndex }
}
