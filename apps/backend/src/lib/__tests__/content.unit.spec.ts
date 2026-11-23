import {
  isBannerActive,
  isLive,
  resolveNavigationUrl,
  toNavigationTree,
  toStoreReviewSummary,
  toStoreServiceGroup,
} from "../content"

const NOW = new Date("2026-11-23T12:00:00Z")
const before = new Date("2026-11-23T11:00:00Z")
const after = new Date("2026-11-23T13:00:00Z")

describe("isLive", () => {
  it("shows published records and hides drafts", () => {
    expect(isLive({ status: "published" }, NOW)).toBe(true)
    expect(isLive({ status: "draft" }, NOW)).toBe(false)
  })

  it("holds a scheduled record back until its time", () => {
    expect(isLive({ status: "published", publish_at: after }, NOW)).toBe(false)
    expect(isLive({ status: "published", publish_at: before }, NOW)).toBe(true)
    expect(isLive({ status: "draft", publish_at: before }, NOW)).toBe(false)
  })
})

describe("isBannerActive", () => {
  it("needs the banner switched on", () => {
    expect(isBannerActive({ is_enabled: true }, NOW)).toBe(true)
    expect(isBannerActive({ is_enabled: false }, NOW)).toBe(false)
  })

  it("respects the start and end of its window", () => {
    expect(isBannerActive({ is_enabled: true, starts_at: after }, NOW)).toBe(false)
    expect(
      isBannerActive({ is_enabled: true, starts_at: before, ends_at: after }, NOW)
    ).toBe(true)
    expect(isBannerActive({ is_enabled: true, ends_at: before }, NOW)).toBe(false)
    // The end moment itself is already outside the window.
    expect(isBannerActive({ is_enabled: true, ends_at: NOW }, NOW)).toBe(false)
  })
})

describe("navigation", () => {
  const item = (id: string, extra: Record<string, unknown> = {}) => ({
    id,
    label: id,
    link_type: "custom",
    url: `/${id}`,
    open_in_new_tab: false,
    is_visible: true,
    parent_id: null,
    rank: 0,
    ...extra,
  })

  it("builds storefront paths for categories, brands and pages", () => {
    expect(resolveNavigationUrl({ link_type: "category", link_ref: "clippers" })).toBe(
      "/categories/clippers"
    )
    expect(resolveNavigationUrl({ link_type: "brand", link_ref: "maestro" })).toBe(
      "/brands/maestro"
    )
    expect(resolveNavigationUrl({ link_type: "page", link_ref: "about" })).toBe("/about")
    expect(resolveNavigationUrl({ link_type: "custom", url: "/#pricing" })).toBe(
      "/#pricing"
    )
    expect(resolveNavigationUrl({ link_type: "custom", url: null })).toBe("/")
  })

  it("orders entries by rank and nests children one level deep", () => {
    const tree = toNavigationTree([
      item("b", { rank: 20 }),
      item("a", { rank: 10 }),
      item("a-2", { parent_id: "a", rank: 2 }),
      item("a-1", { parent_id: "a", rank: 1 }),
      item("a-1-x", { parent_id: "a-1" }),
    ])
    expect(tree.map((entry) => entry.id)).toEqual(["a", "b"])
    expect(tree[0].children.map((entry) => entry.id)).toEqual(["a-1", "a-2"])
    expect(tree[0].children[0].children).toEqual([])
  })

  it("hides a hidden entry together with its children", () => {
    const tree = toNavigationTree([
      item("shown"),
      item("hidden", { is_visible: false }),
      item("child-of-hidden", { parent_id: "hidden" }),
    ])
    expect(tree.map((entry) => entry.id)).toEqual(["shown"])
  })
})

describe("price list", () => {
  const group = {
    id: "g1",
    title: "תספורות",
    note: null,
    items: [
      { id: "third", name: "c", rank: 30, is_visible: true },
      { id: "hidden", name: "h", rank: 5, is_visible: false },
      { id: "first", name: "a", rank: 10, is_visible: true, price: 80 },
      { id: "deleted", name: "d", rank: 1, is_visible: true, deleted_at: before },
    ],
  }

  it("lists visible services in rank order and leaves out hidden and deleted ones", () => {
    expect(toStoreServiceGroup(group).items.map((item) => item.id)).toEqual([
      "first",
      "third",
    ])
  })

  it("includes hidden services for a preview, but never deleted ones", () => {
    expect(toStoreServiceGroup(group, true).items.map((item) => item.id)).toEqual([
      "hidden",
      "first",
      "third",
    ])
  })

  it("copes with a group that has no services", () => {
    expect(toStoreServiceGroup({ id: "g2", title: "ריק" }).items).toEqual([])
  })
})

describe("review summary", () => {
  it("is empty until the score has been entered in site settings", () => {
    expect(toStoreReviewSummary(undefined)).toEqual({
      rating: null,
      count: null,
      url: null,
    })
  })

  it("passes the score, count and link through", () => {
    expect(
      toStoreReviewSummary({
        google_rating: 4.9,
        google_review_count: 120,
        google_reviews_url: "https://example.com/reviews",
      })
    ).toEqual({ rating: 4.9, count: 120, url: "https://example.com/reviews" })
  })
})
