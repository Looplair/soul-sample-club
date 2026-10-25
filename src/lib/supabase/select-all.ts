// Supabase returns at most 1,000 rows per request, so a plain select quietly
// drops everything past that. Pages through a query until it's all read.
export async function selectAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }>,
  pageSize = 1000
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await page(from, from + pageSize - 1);
    if (error) throw error;
    const batch = (data as T[] | null) ?? [];
    rows.push(...batch);
    if (batch.length < pageSize) return rows;
  }
}
