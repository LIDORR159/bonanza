import { expect, test } from "@playwright/test"
import { addToCart, checkoutToPaymentPage, uniqueEmail, waitForEmail } from "./helpers"

/** Registration, sign-in, profile, addresses, order history and password reset. */

const PASSWORD = "Test-pass-12345"

test.describe.serial("customer account", () => {
  const email = uniqueEmail("customer")

  test("registering creates an account and signs in", async ({ page }) => {
    await page.goto("/account")
    await expect(page).toHaveURL(/\/account\/login/)
    await page.getByRole("link", { name: "פתיחת חשבון" }).click()

    // A weak password and a bad phone are refused with messages by the fields.
    await page.getByLabel("שם פרטי").fill("נועם")
    await page.getByLabel("שם משפחה").fill("לוי")
    await page.getByLabel("אימייל").fill(email)
    await page.getByLabel("טלפון נייד").fill("123")
    await page.getByLabel("סיסמה").fill("short")
    await page.getByRole("button", { name: "פתיחת חשבון" }).click()
    await expect(page.getByText("הסיסמה צריכה להכיל לפחות 8 תווים.")).toBeVisible()
    await expect(page.getByText("יש להזין מספר טלפון ישראלי תקין.")).toBeVisible()

    await page.getByLabel("טלפון נייד").fill("052-7654321")
    await page.getByLabel("סיסמה").fill(PASSWORD)
    await page.getByRole("button", { name: "פתיחת חשבון" }).click()

    await expect(page).toHaveURL(/\/account$/)
    await expect(page.getByText("שלום, נועם")).toBeVisible()
    await expect(page.getByText("עדיין לא ביצעת הזמנות.")).toBeVisible()
  })

  test("the same email cannot register twice", async ({ page }) => {
    await page.goto("/account/register")
    await page.getByLabel("שם פרטי").fill("אחר")
    await page.getByLabel("שם משפחה").fill("אחר")
    await page.getByLabel("אימייל").fill(email)
    await page.getByLabel("סיסמה").fill("Another-pass-999")
    await page.getByRole("button", { name: "פתיחת חשבון" }).click()
    await expect(page.getByText("כבר קיים חשבון עם כתובת האימייל הזו.")).toBeVisible()
  })

  test("a wrong password is refused; the right one signs in", async ({ page }) => {
    await page.goto("/account/login")
    await page.getByLabel("אימייל").fill(email)
    await page.getByLabel("סיסמה").fill("wrong-password")
    await page.getByRole("button", { name: "כניסה" }).click()
    await expect(page.getByText("האימייל או הסיסמה שגויים.")).toBeVisible()

    await page.getByLabel("סיסמה").fill(PASSWORD)
    await page.getByRole("button", { name: "כניסה" }).click()
    await expect(page.getByText("שלום, נועם")).toBeVisible()
  })

  test("profile, address book, and an order placed while signed in", async ({ page }) => {
    await page.goto("/account/login")
    await page.getByLabel("אימייל").fill(email)
    await page.getByLabel("סיסמה").fill(PASSWORD)
    await page.getByRole("button", { name: "כניסה" }).click()
    await expect(page.getByText("שלום, נועם")).toBeVisible()

    // Profile
    await page.getByRole("link", { name: "פרטים אישיים" }).click()
    await expect(page.getByLabel("טלפון נייד")).toHaveValue("052-7654321")
    await page.getByLabel("שם פרטי").fill("נועה")
    await page.getByRole("button", { name: "שמירה" }).click()
    await expect(page.getByText("הפרטים נשמרו.")).toBeVisible()

    // Address book
    await page.getByRole("link", { name: "כתובות" }).click()
    await expect(page.getByText("לא נשמרו כתובות.")).toBeVisible()
    await page.getByLabel("שם פרטי").fill("נועה")
    await page.getByLabel("שם משפחה").fill("לוי")
    await page.getByLabel("טלפון נייד").fill("0527654321")
    await page.getByLabel("רחוב ומספר בית").fill("דיזנגוף 99")
    await page.getByLabel("עיר").fill("תל אביב")
    await page.getByLabel("מיקוד").fill("6433222")
    await page.getByLabel("קביעה כברירת מחדל למשלוח").check()
    await page.getByRole("button", { name: "שמירה" }).click()
    await expect(page.getByText("דיזנגוף 99")).toBeVisible()
    await expect(page.getByText("ברירת מחדל למשלוח", { exact: true })).toBeVisible()

    // Checkout starts from the saved address and the account's email.
    await addToCart(page, "barbera-matte-clay")
    await page.goto("/checkout")
    await expect(page.getByLabel("אימייל")).toHaveValue(email)
    await expect(page.getByLabel("רחוב ומספר בית")).toHaveValue("דיזנגוף 99")
    await expect(page.getByLabel("טלפון נייד")).toHaveValue("052-7654321")
    await page.getByRole("button", { name: "המשך לבחירת משלוח" }).click()
    await page.getByRole("group", { name: "שיטת משלוח" }).getByText("איסוף עצמי מהחנות").click()
    await page.getByRole("button", { name: "המשך לתשלום" }).click()
    await page.getByRole("button", { name: "מעבר לתשלום מאובטח" }).click()
    await page.waitForURL(/\/dev-gateway\/pay\//)
    await page.getByRole("button", { name: "אישור תשלום" }).click()
    await page.waitForURL(/\/order\/order_[^/]+\/confirmed/, { timeout: 60_000 })

    // The order is in the account's history, and opens.
    await page.goto("/account/orders")
    await expect(page.getByText("₪69")).toBeVisible()
    await page.getByRole("link", { name: "צפייה בהזמנה" }).click()
    await expect(page.getByText("ווקס מט Barbera Matte Clay")).toBeVisible()
    await expect(page.getByText("שולם")).toBeVisible()
  })

  test("signing out ends the session", async ({ page }) => {
    await page.goto("/account/login")
    await page.getByLabel("אימייל").fill(email)
    await page.getByLabel("סיסמה").fill(PASSWORD)
    await page.getByRole("button", { name: "כניסה" }).click()
    await page.getByRole("button", { name: "יציאה" }).click()
    await expect(page).toHaveURL(/\/account\/login/)
    await page.goto("/account/orders")
    await expect(page).toHaveURL(/\/account\/login/)
  })

  test("password reset by email", async ({ page, request }) => {
    const newPassword = "Brand-new-pass-777"
    await page.goto("/account/login")
    await page.getByRole("link", { name: "שכחתי סיסמה" }).click()
    // Wait for the new page: the sign-in page has an email field too.
    await expect(page.getByRole("heading", { name: "איפוס סיסמה" })).toBeVisible()
    await page.getByLabel("אימייל").fill(email)
    await page.getByRole("button", { name: "שליחת קישור לאיפוס" }).click()
    await expect(page.getByText("אם הכתובת רשומה אצלנו")).toBeVisible()

    // The link arrives by email, in Hebrew, pointing at the storefront.
    const html = await waitForEmail(request, email, "איפוס סיסמה")
    const link = html.match(/href="([^"]*\/account\/reset-password\?[^"]+)"/)![1].replace(/&amp;/g, "&")
    await page.goto(link)

    await page.getByLabel("סיסמה חדשה").fill(newPassword)
    await page.getByLabel("אימות סיסמה").fill("does-not-match")
    await page.getByRole("button", { name: "שמירת הסיסמה" }).click()
    await expect(page.getByText("הסיסמאות אינן זהות.")).toBeVisible()

    await page.getByLabel("אימות סיסמה").fill(newPassword)
    await page.getByRole("button", { name: "שמירת הסיסמה" }).click()
    await expect(page.getByText("הסיסמה עודכנה. אפשר להתחבר.")).toBeVisible()

    // The old password no longer works; the new one does.
    await page.goto("/account/login")
    await page.getByLabel("אימייל").fill(email)
    await page.getByLabel("סיסמה").fill(PASSWORD)
    await page.getByRole("button", { name: "כניסה" }).click()
    await expect(page.getByText("האימייל או הסיסמה שגויים.")).toBeVisible()
    await page.getByLabel("סיסמה").fill(newPassword)
    await page.getByRole("button", { name: "כניסה" }).click()
    await expect(page.getByText("שלום, נועה")).toBeVisible()
  })

  test("the reset form gives the same answer for an unknown address", async ({ page }) => {
    await page.goto("/account/forgot-password")
    await page.getByLabel("אימייל").fill(uniqueEmail("nobody"))
    await page.getByRole("button", { name: "שליחת קישור לאיפוס" }).click()
    await expect(page.getByText("אם הכתובת רשומה אצלנו")).toBeVisible()
  })
})

test("one customer cannot open another customer's order", async ({ browser }) => {
  // Customer A places an order as a guest-turned-known order id.
  const contextA = await browser.newContext()
  const pageA = await contextA.newPage()
  await addToCart(pageA, "barbera-matte-clay")
  await checkoutToPaymentPage(pageA, uniqueEmail("owner"))
  await pageA.getByRole("button", { name: "אישור תשלום" }).click()
  await pageA.waitForURL(/\/order\/(order_[^/]+)\/confirmed/, { timeout: 60_000 })
  const orderId = pageA.url().match(/order\/(order_[^/]+)\//)![1]
  await contextA.close()

  // Customer B, signed in, asks for it inside their account.
  const contextB = await browser.newContext()
  const pageB = await contextB.newPage()
  await pageB.goto("/account/register")
  await pageB.getByLabel("שם פרטי").fill("אורח")
  await pageB.getByLabel("שם משפחה").fill("אחר")
  await pageB.getByLabel("אימייל").fill(uniqueEmail("other"))
  await pageB.getByLabel("סיסמה").fill(PASSWORD)
  await pageB.getByRole("button", { name: "פתיחת חשבון" }).click()
  await expect(pageB).toHaveURL(/\/account$/)
  const response = await pageB.goto(`/account/orders/${orderId}`)
  expect(response?.status()).toBe(404)
  await contextB.close()
})
