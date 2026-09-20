type AuthLoadingScreenProps = {
  message?: string
}

export function AuthLoadingScreen({ message = 'Loading your AquaGas account…' }: AuthLoadingScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4" role="status" aria-live="polite">
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <div className="absolute -inset-2 rounded-[1.4rem] bg-water-200/50 blur-lg" aria-hidden="true" />
          <img src="/logo.svg" alt="" className="relative h-16 w-16 rounded-2xl shadow-lg" />
        </div>
        <p className="mt-4 text-xl font-black tracking-tight">
          <span className="text-water-600">Aqua</span><span className="text-red-600">Gas</span>
        </p>
        <div className="mt-4 h-1 w-28 overflow-hidden rounded-full bg-water-100" aria-hidden="true">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-water-500" />
        </div>
        <p className="mt-3 text-sm font-medium text-gray-500">{message}</p>
      </div>
    </div>
  )
}
