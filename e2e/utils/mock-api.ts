export function apiSuccess<T>(data: T) {
  return {
    success: true,
    data,
  };
}
