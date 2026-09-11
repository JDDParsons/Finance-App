export default defineEventHandler((event) => {
  if (getRequestURL(event).pathname.includes('/api/')) {
    setResponseHeader(event, 'Cache-Control', 'private, no-store')
    setResponseHeader(event, 'Pragma', 'no-cache')
  }
})
