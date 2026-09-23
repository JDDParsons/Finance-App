export function isValidCronAuthorization(
  authorization: string | undefined,
  cronSecret: string | undefined,
): boolean {
  return Boolean(cronSecret) && authorization === `Bearer ${cronSecret}`
}
