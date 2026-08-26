export function buildPublicAppUrl(path: string) {
  const configuredOrigin = import.meta.env.VITE_PUBLIC_APP_URL?.trim()
  const baseUrl = configuredOrigin || window.location.origin

  return new URL(path, baseUrl).toString()
}
