/** Mock-data design pages render in local dev and on Vercel preview
 *  deployments only; production (Vercel or Docker) answers 404. */
export function designPreviewsEnabled() {
  return process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
}
