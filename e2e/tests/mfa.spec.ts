import { createHmac } from "node:crypto"
import { expect, test } from "@playwright/test"
import { adminApi, BACKEND_URL, uniqueEmail } from "./helpers"

/**
 * Two-factor sign-in for admin users, end to end through the API the
 * dashboard uses: enrol an authenticator app, then sign in with a code.
 *
 * Every admin has full access in the open-source edition of Medusa, so the
 * second factor is the main protection of an admin account. The test uses a
 * throwaway admin user and never touches the seeded one.
 */

const PASSWORD = "Test-only-passphrase-9"

/** RFC 6238 time-based code: HMAC-SHA1, 30-second steps, 6 digits. */
function totp(base32Secret: string, at = Date.now()): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
  let bits = ""
  for (const char of base32Secret.replace(/=+$/, "").toUpperCase()) {
    bits += alphabet.indexOf(char).toString(2).padStart(5, "0")
  }
  const key = Buffer.from(bits.match(/.{8}/g)!.map((byte) => parseInt(byte, 2)))
  const counter = Buffer.alloc(8)
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 30_000)))
  const digest = createHmac("sha1", key).update(counter).digest()
  const offset = digest[digest.length - 1]! & 0x0f
  const number = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000
  return String(number).padStart(6, "0")
}

/** Waits for the next 30-second step, so a code is never used twice. */
const nextStep = () =>
  new Promise((resolve) => setTimeout(resolve, 30_000 - (Date.now() % 30_000) + 500))

test("an admin can enrol an authenticator app, and then cannot sign in without a code", async ({
  request,
}) => {
  test.setTimeout(150_000)
  const email = uniqueEmail("mfa-admin")
  const json = { "content-type": "application/json" }
  const bearer = (token: string) => ({ ...json, authorization: `Bearer ${token}` })

  // A throwaway admin user, created the way the dashboard does: by invitation.
  const invited = await adminApi(request, "post", "/admin/invites", { email })
  expect(invited.ok(), "create invite").toBeTruthy()
  const inviteToken = (await invited.json()).invite.token as string
  const registered = await request.post(`${BACKEND_URL}/auth/user/emailpass/register`, {
    data: { email, password: PASSWORD },
  })
  expect(registered.ok(), "register login").toBeTruthy()
  const accepted = await request.post(
    `${BACKEND_URL}/admin/invites/accept?token=${encodeURIComponent(inviteToken)}`,
    {
      headers: bearer((await registered.json()).token),
      data: { email, first_name: "MFA", last_name: "Test" },
    }
  )
  expect(accepted.ok(), "accept invite").toBeTruthy()
  const userId = (await accepted.json()).user.id as string

  try {
    const signIn = () =>
      request.post(`${BACKEND_URL}/auth/user/emailpass`, {
        data: { email, password: PASSWORD },
      })

    // Before enrolment, the password alone is enough.
    const first = await (await signIn()).json()
    expect(first.mfa_challenge).toBeFalsy()
    expect(
      (
        await request.get(`${BACKEND_URL}/admin/users/me`, {
          headers: bearer(first.token),
        })
      ).status()
    ).toBe(200)

    // Enrol: the backend issues a secret, and the app's first code confirms it.
    const started = await request.post(`${BACKEND_URL}/auth/mfa/factors`, {
      headers: bearer(first.token),
      data: { provider: "totp", label: "Test authenticator" },
    })
    expect(
      started.ok(),
      `start enrolment: ${started.status()} ${await started.text()}`
    ).toBeTruthy()
    const setup = await started.json()
    const secret = (setup.secret ?? setup.mfa_factor?.secret) as string
    const factorId = (setup.mfa_factor?.id ?? setup.id) as string
    expect(secret, "the secret for the authenticator app").toMatch(/^[A-Z2-7]+=*$/)
    expect(setup.otpauth_url ?? setup.mfa_factor?.otpauth_url).toMatch(
      /^otpauth:\/\/totp\//
    )

    const wrongEnrolment = await request.post(
      `${BACKEND_URL}/auth/mfa/factors/${factorId}/verify`,
      { headers: bearer(first.token), data: { code: "000000" } }
    )
    expect(wrongEnrolment.ok(), "a wrong code must not confirm enrolment").toBeFalsy()

    const confirmed = await request.post(
      `${BACKEND_URL}/auth/mfa/factors/${factorId}/verify`,
      {
        headers: bearer(first.token),
        data: { code: totp(secret) },
      }
    )
    expect(
      confirmed.ok(),
      `confirm enrolment: ${confirmed.status()} ${await confirmed.text()}`
    ).toBeTruthy()

    // From now on the password only opens a challenge.
    await nextStep()
    const second = await (await signIn()).json()
    expect(second.mfa_challenge?.id, "a challenge instead of a session").toBeTruthy()
    if (second.token) {
      // Whatever token accompanies a challenge must not open the Admin API.
      expect(
        (
          await request.get(`${BACKEND_URL}/admin/users/me`, {
            headers: bearer(second.token),
          })
        ).status()
      ).toBe(401)
    }

    const verify = (code: string) =>
      request.post(
        `${BACKEND_URL}/auth/mfa/challenges/${second.mfa_challenge.id}/verify`,
        {
          headers: second.token ? bearer(second.token) : json,
          data: { method: "totp", code },
        }
      )
    expect(
      (await verify("000000")).ok(),
      "a wrong code must not pass the challenge"
    ).toBeFalsy()

    const passed = await verify(totp(secret))
    expect(
      passed.ok(),
      `pass the challenge: ${passed.status()} ${await passed.text()}`
    ).toBeTruthy()
    const session = (await passed.json()).token as string
    expect(
      (
        await request.get(`${BACKEND_URL}/admin/users/me`, { headers: bearer(session) })
      ).status()
    ).toBe(200)
  } finally {
    await adminApi(request, "delete", `/admin/users/${userId}`)
  }
})
