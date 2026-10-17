export type PagedResponse<T> = {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
};

export function toPagedResponse<T>(
  content: T[],
  pageIndex: number,
  size: number,
  totalElements: number,
): PagedResponse<T> {
  const totalPages = size > 0 ? Math.ceil(totalElements / size) : 0;
  return {
    content,
    page: pageIndex + 1,
    size,
    totalElements,
    totalPages,
    last: totalPages === 0 || pageIndex >= totalPages - 1,
  };
}
