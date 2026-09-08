export function formatYen(amount: number | null | undefined): string {
  if (amount == null) return '-'
  return `${amount.toLocaleString('ja-JP')}円`
}

export function formatDate(input: string | null | undefined): string {
  if (!input) return '-'
  return input.slice(0, 10)
}
