import Medusa from "@medusajs/js-sdk"

/**
 * The admin's API client. It talks to the origin the dashboard was loaded
 * from and uses the session cookie the dashboard already holds, so custom
 * screens are signed in exactly like the built-in ones.
 */
export const sdk = new Medusa({
  baseUrl: (typeof __BACKEND_URL__ !== "undefined" && __BACKEND_URL__) || "/",
  auth: { type: "session" },
})
