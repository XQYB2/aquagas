export function withTimeout<T>(
  request: PromiseLike<T>,
  timeoutMs: number,
  message = 'The request took too long. Please try again.'
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs)

    Promise.resolve(request).then(
      value => {
        window.clearTimeout(timeoutId)
        resolve(value)
      },
      error => {
        window.clearTimeout(timeoutId)
        reject(error)
      }
    )
  })
}
