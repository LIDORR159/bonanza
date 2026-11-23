# Managing site content

This guide is for the person who runs the site day to day. It goes job by job: which screen to open in the admin dashboard, which fields to fill in, and what a visitor then sees.

Everything here was checked against the code on 2026-11-23. Labels are quoted as the dashboard shows them in English (`apps/backend/src/admin/i18n/json/en.json`). With the dashboard set to Hebrew, the same screens show the Hebrew labels from `he.json` in the same folder.

Two things to know before you start:

- **Nothing is deployed.** The admin runs on a development machine only. The production address is planned, not live.
- **Most of what a local install shows is sample content.** The demo seed creates an invented price list, gallery, team, reviews, phone number and opening hours so that the pages can be seen filled in. The screenshots in [docs/screenshots](screenshots) show that sample content too. [Before launch](#before-launch-sample-content-to-replace) lists what has to be replaced.

## Where the admin is and how to sign in

| Environment | Address | Status |
|---|---|---|
| Local development | http://localhost:9000/app | Works once `pnpm dev` is running. See [local-development.md](local-development.md#local-addresses). |
| Production | `/app` on the dashboard hostname | Planned. No server and no domain exist yet. See [architecture.md](architecture.md#hostnames). |

Locally, the sign-in is the `ADMIN_EMAIL` and `ADMIN_PASSWORD` values in `apps/backend/.env`, which `pnpm dev:setup` generates. How to change the password or add another admin user is in [local-development.md](local-development.md#local-addresses).

Give each person their own admin account. Every admin user has full access; there are no roles. See [security.md](security.md#no-roles-or-permissions-for-admin-users).

**Turn on two-factor sign-in for your account.** With no roles, the second factor is the main protection of an admin account. It is set up in your **Profile**, under Settings, in the section **Two-factor authentication**, with an authenticator app on your phone. Once it is on, the password alone no longer signs you in. That behaviour is tested (`e2e/tests/mfa.spec.ts`). The profile screens themselves and the recovery codes have not been tested on this project, so try a recovery code once after you enrol, and keep the codes somewhere safe. Nothing forces an admin to enrol; each person has to do it. See [security.md](security.md#13-two-factor-sign-in-for-admins-mfa).

## Finding your way around

| To change | Open |
|---|---|
| The home page, price list, gallery, team, reviews, banners, pages, menus, business details | **Site content** in the sidebar. It opens on the **Home page** tab; the other tabs run along the top: **Price list**, **Gallery**, **Team**, **Reviews**, **Banners**, **Pages**, **Menus**, **Site settings**, **Translations**. |
| Brands | **Brands**, under **Products** in the sidebar |
| A product's brand and its search-engine fields | The product's own page: the **Brand** card and the **Search engines** card |
| A category's search-engine fields | The category's own page: the **Search engines** card |
| English and Arabic text | **Translations** (the last tab of Site content, which leads to Medusa's own screen under Settings) |
| Who changed what | **Activity log**, under Settings |

Products, prices, stock, orders, customers and promotions are Medusa's built-in screens and are not covered here.

Every list screen works the same way:

- The button at the top right adds a record (**Add section**, **Add photo**, and so on). A panel opens at the side with the fields, and **Save** and **Cancel** at the bottom.
- Each row has small buttons at its end: **Move up**, **Move down**, **Edit**, **Delete**. Delete asks "Delete this record?" first. A deleted record disappears from the site.
- A field marked with an asterisk is required.
- If the server refuses a save (a link in the wrong format, a text that is too long, an address already in use), a message says why and nothing is changed.

## How publishing works

Four controls decide whether a visitor sees something. Which of them a record has depends on its type.

| Control | Found on | What it does |
|---|---|---|
| **Status**: **Draft** or **Published** | Home page sections, price list groups, gallery photos, team members, reviews, pages | A draft is never shown to visitors. |
| **Publish at** | Home page sections and pages, once Status is Published | Leave it empty to publish immediately. With a future date the record is listed as **Scheduled** and appears on its own at that time. |
| **Show on the site** (a switch) | Home page sections, services in the price list, menu links | Hides one item without deleting it or changing its status. |
| **Enabled**, with **Show from** and **Show until** | Banners | A banner shows while it is enabled and inside its dates. |

The Status column shows a badge: **Draft**, **Published** or **Scheduled**. Banners show **Showing** or **Not showing** instead.

Dates and times are entered in the time zone of the computer you are working on.

## How long a change takes to reach the site

Normally a few seconds.

| Situation | When visitors see it |
|---|---|
| You save a change to site content, a brand, a translation, a product, a variant, a category or a collection | The backend sends the storefront a "refresh" call about a second and a half later, authorised by a secret the two servers share, and the next visit to a page shows the new content. The browser tests allow up to 30 seconds for this. |
| The refresh call does not get through (the storefront is restarting, or the two servers' `REVALIDATE_SECRET` values differ) | Within 5 minutes. Cached pages are rebuilt on a 5-minute timer regardless (`REVALIDATE_SECONDS` in `apps/storefront/lib/config.ts`). The list of products in the sitemap is the exception: its timer is one hour. The backend log has a warning line starting "Storefront revalidation". |
| A **Publish at** time arrives, or a banner reaches its **Show from** or **Show until** time | Within 5 minutes of that time. Nothing is saved at that moment, so no refresh call is sent and the timer does the work. This follows from the code and has not been timed. |

The cart, checkout and account pages are never cached.

If pages are later cached by a CDN as well, its own cache time is added on top. That is not part of the planned setup; see [cloudflare-deployment.md](cloudflare-deployment.md#what-the-cdn-can-and-cannot-cache).

## The home page

Open **Site content**. The **Home page** tab lists the page's sections from top to bottom. The home page is exactly this list: only sections that are switched on, published and past their publish time appear.

### Adding, ordering, hiding and scheduling sections

| To do this | Do this |
|---|---|
| Add a section | **Add section**. Choose the **Type**, give it a **Key**, fill in the fields that appear for that type, and save. |
| Change the order | **Move up** and **Move down** on the row. |
| Hide a section for now | Turn off the switch in the **Visible** column, or **Show on the site** inside the form. |
| Work on a section without showing it | Leave **Status** on **Draft**. A new section starts as a draft. |
| Publish it | Set **Status** to **Published**. |
| Publish it later | Set **Status** to **Published** and fill in **Publish at**. |
| Remove it | **Delete** on the row. |

Three things are easy to miss:

- **The Key is also the section's address on the page.** A section with the key `pricing` is reached at `/#pricing`, and the starter menus link to `/#pricing`, `/#academy` and `/#about`. If you change a key, update the menu link that points to it. A key is lowercase English letters, digits and hyphens, and no two sections may share one.
- **A new section is not added at the end.** It can land near the top of the list. Put it in place with the arrows before you publish it.
- **When no section is showing, the site falls back to a built-in default home page** (the brand name and the newest products). That is the case when the list is empty, and also when every section is hidden or a draft.

The starter content creates eight sections that are switched on, in this order: hero, info strip, About, price list, a product row, Academy, gallery, reviews. It also creates nine more that are switched off and ready to use: categories, two banner positions, four product rows (best sellers, new arrivals, deals, professional equipment), brands and the newsletter sign-up.

### What each section type shows

| Type | The visitor sees | Fields it uses | It shows nothing when |
|---|---|---|---|
| **Hero** | The opening block: a large title, one line of text, up to two buttons and a photograph. See [The hero](#the-hero). | Title, Subtitle, Image, Image description, both buttons | Never. |
| **Info strip (hours, address, phone)** | A thin band with the opening hours, the address (linked to a map) and the phone number. Only the first two lines of opening hours that have hours are shown. | None of its own. It reads **Site settings**. | Opening hours, address and phone are all empty. |
| **About** | The shop's story beside a photograph. See [The story](#the-story-about-section). | Title, Subtitle, Text, Image, Image description, one button | Never. |
| **Price list** | The service price list, one card per group. See [The price list](#the-price-list). | Title, Subtitle, Text | Never. With no services it shows a line saying the price list will be updated soon. |
| **Gallery** | A row of photographs with a link to the gallery page. It shows the photos marked **Show on the home page**; if none is marked, the first photos in the gallery. | Title, Subtitle, one button, How many to show (4 if empty) | There are no published photos. |
| **Reviews** | The overall score, the link to all reviews and the review cards. See [Reviews](#reviews). | Title, Subtitle, How many to show (3 if empty) | There are no published reviews and no Google rating. |
| **Product row** | A row of product cards with a title and a link. | Title, Subtitle, one button, **Products from**, **Target**, How many to show (4 if empty) | No product matches. |
| **Categories** | A tile for each top-level product category, each with one product picture. | Title, one button, How many to show (8 if empty) | There are no categories. |
| **Brands** | A tile for each brand marked **Show on the home page**. | Title, one button, How many to show (8 if empty) | No brand is marked. |
| **Banner** | The first banner that is showing in the chosen **Banner placement**. See [Banners](#banners). | Banner placement | No banner in that placement is showing. |
| **Academy** | A wide block on a sage-green background: a large line in a serif typeface, text, up to two buttons, and a picture shown in black and white. Without a picture it shows the brand logo. | Title, Subtitle, Text, Image, Image description, both buttons | Never. |
| **Text block** | A centred title, subtitle and paragraph. | Title, Subtitle, Text | Never. |
| **Newsletter sign-up** | A title, a line of text and an email form with a consent box. | Title, Subtitle | When "Newsletter sign-up" is switched off in site settings. |

A **Product row** takes its products from one of six sources, chosen in **Products from**: **Newest products**, **Products on sale**, **A tag**, **A category**, **A collection** or **A brand**. For the last four, choose which one in **Target**. The starter row reads the product tag `featured`, so tagging a product `featured` puts it in that row.

When a Product row comes directly after the Hero, its first four products are drawn as cards overlapping the bottom of the hero, and the row's own title and button are not shown.

**How many to show** accepts 1 to 24.

### The hero

Edit the section of type **Hero**.

| Field | What the visitor sees | If left empty |
|---|---|---|
| **Title** | The large headline | "BONANZA" |
| **Subtitle** | One line under the headline | No line |
| **Image** | The photograph beside the text, in a frame three units wide by two high | A default photograph that ships with the site |
| **Image description** | Read aloud to visitors who cannot see the image | No description is read |
| **Button text** and **Button link** | The main button. Both must be filled in. A full `https://` address opens in a new tab; a path such as `/products` stays on the site. | A button to the shop |
| **Second button text** and **Second button link** | A second, outlined button | No second button |

The small line above the headline ("BARBERSHOP & ACADEMY") is fixed and is not edited here.

**The hero's main button has its own link.** In the starter content it holds the booking address. Changing **Booking link** in Site settings does not change this button; change both.

The photograph in the starter content was supplied by the owner. See [Before launch](#before-launch-sample-content-to-replace) for the two open points about it.

### The story (About section)

Edit the section of type **About**.

| Field | What the visitor sees | If left empty |
|---|---|---|
| **Subtitle** | A small line above the title | No line |
| **Title** | Set large, in the serif typeface, as a quotation | A built-in line |
| **Text** | The story. Leave a blank line between paragraphs. | No text |
| **Image** | The photograph beside the text, in a frame three units wide by four high | A default photograph of the shop front |
| **Image description** | Read aloud to visitors who cannot see the image | |
| **Button text** and **Button link** | An outlined button under the text | No button |

The story text and the shop-front photograph in the starter content were supplied by the owner.

There is also a separate **About** *page* at `/about`, managed under [Pages](#pages-and-preview-links). The two are independent.

## The price list

Open **Site content → Price list**. The list is made of groups (for example haircuts, beard, packages), each holding services.

**A group**

| Field | Meaning |
|---|---|
| **Title** | The heading of the card. Required. |
| **Note** | A line under the group's title. Optional. |
| **Status** | A draft group, and every service in it, stays off the site. A new group starts as Published. |

**A service** (use **Add service** on the group's row)

| Field | Meaning |
|---|---|
| **Group** | Which card it belongs to. Required. |
| **Name** | Required. |
| **Description** | One short line under the name. Optional. |
| **Price (₪)** | Whole shekels, VAT included. Leave empty to show only the price note. |
| **Price note** | Shown before the price ("from") or instead of it ("by quote"). Optional. |
| **Duration (minutes)** | Shown after the description, as a number of minutes. Optional. |
| **Show on the site** | Turn off to hide this one service. The switch is also on the service's row. |

| To do this | Do this |
|---|---|
| Show "from ₪120" | Price `120`, Price note `from` |
| Show "by quote" with no price | Leave Price empty, Price note `by quote` |
| Hide one service | Turn off its switch |
| Hide a whole group | Set the group's Status to Draft |
| Change the order | **Move up** and **Move down**, on groups and on services |

What the visitor sees: on the home page, the **Price list** section shows one card per published group. Each row is a service: its name, then its description and duration in small type, a dotted line, and the price note and price. A group with no visible service is left out.

Deleting a group deletes its services with it.

The heading, subtitle and the line about VAT above the cards belong to the home page section of type **Price list**, not to this tab. The button beside that heading uses the section's own Button text and Button link when they are filled in; otherwise it is the **Booking link** from Site settings. The section form also offers Button text and Button link, but the storefront does not use them for this type.

## The gallery

Open **Site content → Gallery**.

| Field | Meaning |
|---|---|
| **Image** | **Upload** a file from your computer. Required. See [Images](#images). |
| **Image description** | Read aloud to visitors who cannot see the image. If empty, the caption is used; if that is empty too, a general phrase. |
| **Caption** | A short line shown under the photo on the gallery page. Optional. |
| **Show on the home page** | Marks the photo for the home page's Gallery section. The switch is also on the photo's row. |
| **Status** | Only Published photos are shown. A new photo starts as Published. |

What the visitor sees:

- **The gallery page** (`/gallery`) shows every published photo in the order of the list, up to 60, cropped to one upright shape (four wide by five high) so the rows stay even.
- **The home page's Gallery section** shows the photos marked for the home page, up to the section's **How many to show**.

## The team

Open **Site content → Team**.

| Field | Meaning |
|---|---|
| **Name** | Required. |
| **Role** | For example Barber, Owner. Optional. |
| **Photo** | Shown in a small circle. Without one, the first letter of the name is shown. |
| **Instagram link** | The full address of the profile, starting with `https://`. Without one, no Instagram button is shown for that person. |
| **Status** | Only Published members are shown. |

Team members appear on the gallery page, under the photographs, each with a button that opens their Instagram profile in a new tab.

## Reviews

Open **Site content → Reviews**. Reviews are not fetched from Google. Each one is typed in by hand.

| Field | Meaning |
|---|---|
| **Customer name** | Required. |
| **Rating** | One to five stars. Required. |
| **Review** | The customer's own words, unchanged. Required. |
| **Date text** | Free text such as "a month ago". Optional. |
| **Source** | **Google** or **Other**. |
| **Status** | Only Published reviews are shown. |

**Enter only real reviews, exactly as the customer wrote them.** The site presents these cards to visitors as what customers said, under the heading "Google reviews", beside the business's score and a link labelled "All reviews on Google". An invented or reworded review, or a score that is not the real one, misleads the people reading it. Do not correct, shorten or translate a review. Review texts are shown as written in all three languages.

**The sample reviews must be removed before launch.** The demo seed creates three review cards and one draft so that the section can be seen filled in. Their author is "sample customer" and their text says it is not a real review, and the demo settings add an invented Google rating of 4.9 from 120 reviews. None of that may reach a public site. If there are no real reviews to enter yet, delete the samples, clear the Google fields in Site settings, and hide the Reviews section.

The overall score is not on this tab. It comes from three fields in **Site settings**: **Google rating**, **Number of Google reviews** and **Google reviews link**. Update them by hand when the real numbers change.

## Site settings

Open **Site content → Site settings**. This is one form; **Save** is at the bottom.

| Field | Where it appears on the site | If left empty |
|---|---|---|
| **Store name** | The site's name for browsers, link previews and search engines. Required. | |
| **Tagline** | The small line above the hero headline. | The brand's own line, "BARBERSHOP & ACADEMY", is shown. |
| **Page title pattern** | How browser-tab titles are built. `%s` is replaced by the page's own title. Required, and must contain `%s`. | |
| **Default search title**, **Default search description** | Used for search engines on pages that have none of their own. The title is required. | No description is sent |
| **Default sharing image** | The picture shown when a link to the site is shared | A built-in image with the logo |
| **Phone** | The info strip and the footer, as a link that starts a call | Not shown |
| **WhatsApp** | The WhatsApp link in the footer and the green button fixed to the bottom-left corner of every page | The Phone number is used. With neither, the footer has no WhatsApp link and the green button leads to the contact details in the footer. |
| **Email** | The footer | Not shown |
| **Address** | The info strip and the footer. The map is drawn from it unless **Map to embed** is set. | No address, and no map unless Map to embed is set |
| **Opening hours** | The footer shows every line. The info strip shows the first two lines that have hours. | No hours are shown |
| **Booking link** | Every "Book an appointment" button: in the header, the phone menu, the price list section, the footer, the gallery page, and the button fixed to the bottom-right corner of every page. It must be a full address starting with `https://`. | All of those buttons disappear. The hero's own button is separate; see [The hero](#the-hero). |
| **Map to embed** | The map in the footer. In Google Maps choose Share → Embed a map → Copy HTML, and paste it here; only the map's address is kept. The site ignores anything that is not a Google Maps address and draws the map from the Address instead. | The map is drawn from the Address |
| **Map link** | The "open in maps" link under the map, and the link on the address in the info strip | Built from the Address |
| **Google reviews link** | The link to all reviews, at the top of the Reviews section | No link |
| **Google rating** | The large score at the top of the Reviews section. A number from 1 to 5. | No score |
| **Number of Google reviews** | The line under the stars | No line |
| **Instagram** | A link in the footer's contact list | Not shown |
| **Facebook**, **TikTok**, **YouTube** | Small links in the footer | Not shown |
| **Newsletter sign-up** | A master switch for the sign-up form. The form appears when this is on **and** a section of type Newsletter sign-up is shown on the home page. | The form is not shown anywhere. |
| **Free shipping from (₪)** | A line on every product page, and a message in the cart saying how much is missing for free shipping | Neither is shown |

**Opening hours** are typed one row per line, in the form `days | hours`:

```
Sunday–Thursday | 09:00–20:00
Friday | 08:00–14:00
Saturday | Closed
```

A line without `|` is shown as a note under the hours.

**Free shipping from** only changes what shoppers are told. The actual shipping price is set on the shipping option, in Medusa's own settings. Keep the two in step.

The business address also appears in the store's structured data for search engines, together with the phone, email and booking link.

## Banners

Open **Site content → Banners**.

| Field | Meaning |
|---|---|
| **Placement** | Where the banner goes. See the table below. Required. |
| **Title** | Required. |
| **Subtitle** | Optional. |
| **Image**, **Image for phones** | The background picture, and a second one for narrow screens. Without an image the banner is a plain dark panel. |
| **Image description** | Read aloud to visitors who cannot see the image. |
| **Link** and **Button text** | The button appears only when both are filled in. |
| **Show from**, **Show until** | Optional dates. "Show until" must be later than "Show from". |
| **Enabled** | The switch is also on the banner's row. |

| Placement | Where the visitor sees it |
|---|---|
| **Strip above the header** | A thin light strip at the very top of every page, showing the title and subtitle. With a Link, the whole line is a link. |
| **Home page, upper** and **Home page, lower** | On the home page, at the position of a section of type **Banner** set to that placement. The starter content has both sections, switched off. Turn the section on, or the banner has nowhere to appear. |
| **Top of catalog** | Above the product list, on the first page of the catalog, of a category and of a brand. |

Each placement shows one banner: the first one in the list that is enabled and inside its dates. Use the arrows to choose which comes first.

## Pages and preview links

Open **Site content → Pages**. These are the text pages: about, contact, policies and the like. A page with the address `shipping` is served at `/shipping`.

| Field | Meaning |
|---|---|
| **Title** | The page's heading. Required. |
| **Address** | The part after the site address, in English: `about`, `shipping-policy`. Lowercase letters, digits and hyphens. Required. Addresses the store uses itself, such as `products`, `cart`, `account` and `gallery`, are refused. |
| **Content (Markdown)** | The text. Headings, lists, links, bold and tables are written in Markdown. HTML typed here is not rendered. Links to other sites open in a new tab. |
| **Status**, **Publish at** | A new page starts as a Draft. See [How publishing works](#how-publishing-works). |
| **Search title**, **Search description** | What search engines show. With no Search title, the page's own title is used. |
| **Canonical address** | Only for a page whose text also lives at another address. Normally empty. |
| **Sharing image** | The picture shown when the page's link is shared. |
| **Include in sitemap** | On by default. |

The **Revision** column counts how many times a page has been saved.

The starter content creates eight pages as empty drafts: `about`, `contact`, `academy`, `shipping`, `returns`, `privacy`, `terms` and `accessibility`. A menu link to a page appears on the site only once that page is published, so the footer fills in as you publish them.

### Previewing a draft

Press **Preview** on a page's row. The storefront opens in a new tab with a bar across the top that says preview mode is on, and a link to **Exit preview**.

- While previewing, the whole site shows unpublished content: draft pages, draft and hidden home page sections, hidden services, draft photos and disabled banners. To check a draft home page section, press Preview on any page and then go to the home page.
- The link works for 30 minutes.
- **Anyone who has the link can see the drafts until it expires.** Do not post it where it can be copied. See [security.md](security.md#7-signed-preview-links-for-unpublished-content).

## Menus

Open **Site content → Menus**. There are two menus, **Header** and **Footer**.

| Field | Meaning |
|---|---|
| **Menu** | Header or Footer. Required. |
| **Label** | The text of the link. Required. |
| **Links to** | **An address**, **A category**, **A page** or **A brand**. |
| **Address** | For "An address": a path on this site such as `/products` or `/#pricing`, or a full `https://` address. |
| **Target** | For the other three: choose the category, page or brand from the list. |
| **Under** | **Top level**, or one of the top-level entries of the same menu. Menus are one level deep. |
| **Show on the site** | Hides the link without deleting it. Hiding a top-level entry hides everything under it. |
| **Open in a new tab** | For links that leave the site. |

How the two menus are drawn:

- **Header.** Top-level entries are the links in the bar. Entries placed under one of them open in a panel below it. On a phone, the menu opens full-screen.
- **Footer.** Each top-level entry is the *title of a column*, and the entries under it are the links in that column. A top-level footer entry is not itself a link.

A link to a page that is not published is left out automatically, so the menus never lead to a missing page.

## Brands

Open **Brands**, under **Products**.

| Field | Meaning |
|---|---|
| **Name** | Required. |
| **Address** | English, lowercase, with hyphens. The brand's page is `/brands/<address>`. Required. |
| **Logo** | Shown on the home page's Brands section. Without one, the name is set in capitals. |
| **Description** | Optional. |
| **Show on the home page** | Includes the brand in the home page's Brands section. |

Brands appear as a filter in the catalog and on product pages, and each brand has a page listing its products.

To give a product its brand, open the product and choose from the **Brand** card in the side column. **No brand** removes it.

## Search-engine fields for products and categories

Open a product or a category. The **Search engines** card has four fields. Leave them empty to use the name and description.

| Field | Effect |
|---|---|
| **Search title** | Replaces the product or category name in search results and in the browser tab. |
| **Search description** | Replaces the description in search results. |
| **Sharing image** | The picture shown when the link is shared. A product otherwise uses its first image. |
| **Leave out of the sitemap** | The product or category is left out of the sitemap search engines read. The page itself stays reachable. |

Press **Save** on the card; it is separate from the rest of the product page.

## Translations

The site is written in Hebrew. What you type in the screens above *is* the Hebrew text. English and Arabic are stored separately, as translations of each record.

- **Where:** the **Translations** tab of Site content, which opens Medusa's own Translations screen under Settings.
- **How it behaves on the site:** a field that has no translation is shown in Hebrew on the English and Arabic pages. Nothing breaks; the visitor simply sees Hebrew there.
- **Changing Hebrew text does not change its translations.** After rewording something in Hebrew, update the English and Arabic too.

What can be translated:

| Record | Fields |
|---|---|
| Home page sections | Title, Subtitle, Text, Image description, both button texts |
| Price list groups and services | Group title and note; service name, description and price note |
| Gallery photos | Image description, Caption |
| Team members | Name, Role |
| Reviews | Date text only. The review itself and the customer's name are shown as written. |
| Banners | Title, Subtitle, Image description, Button text |
| Pages | Title, Content, Search title, Search description |
| Menu links | Label |
| Site settings | Store name, Tagline, Default search title and description, Address, Opening hours |
| Brands | Name, Description |
| Products, categories and other catalog records | Handled by Medusa itself, on the same screen |

Links, prices, pictures and phone numbers are the same in every language.

The Translations screen is part of Medusa, not of this project's extensions. From the installed dashboard's source (version 2.23.0): it lists one row per type of record with a count of translated fields and an **Edit** button, which opens an editor with a column per language. **Manage entities** and **Manage locales** on that screen control which record types and languages are offered. This project's browser tests do not drive that screen, and this guide has not checked which record types a fresh install offers there.

Two kinds of text are **not** edited in the admin at all:

- The interface texts of the storefront (buttons, form labels, error messages) are in `apps/storefront/lib/i18n/he.ts`, `en.ts` and `ar.ts`. Changing them is a code change.
- Order and password emails are in Hebrew only.

**All English and Arabic wording in the repository is a first draft**, both the interface texts and the seeded content, and is waiting for the owner's review.

## The activity log

Open **Activity log**, under Settings. It is a list, newest first, 50 rows to a page: **When**, **Who**, **Action**, **Record**.

It records creating, changing, deleting and reordering site content and brands, with the admin user who did it, and changes to admin accounts and invitations, which are shown as **System** because Medusa does not say who made them. It records which fields changed, not their old or new content, and it cannot be edited from the dashboard.

It does not record changes to products, prices, stock, orders or customers, or sign-ins. See [security.md](security.md#the-activity-log-is-narrow).

## Images

Every image field has an **Upload** button and a **Clear** button.

| Rule | Detail |
|---|---|
| Accepted types | JPEG, PNG, WebP, AVIF |
| Not accepted | SVG, and anything else. The server looks at the file's content, so renaming a file does not get it through. |
| Largest file | 8 MB |
| Where files go | In development, a folder on the machine. In production, the planned media bucket ([cloudflare-deployment.md](cloudflare-deployment.md#media-bucket-r2)). |

The field also accepts a pasted image address. The storefront only loads images from the hosts it has been told about (`IMAGE_HOSTNAMES`), so an address on some other website will not display. Upload the file instead.

How pictures are cropped on the site:

| Picture | Shape on the site |
|---|---|
| Hero | Wide, 3:2 |
| About | Upright, 3:4 |
| Gallery photos | Upright, 4:5 |
| Academy | Upright, 4:5, shown in black and white |
| Team photos | A small circle |
| Banner | A wide panel; one side is darkened so the text stays readable |
| Brand logos | Fitted into a small box, shown in grey |

Pictures are cropped from the centre to fill their shape. Upload photographs with the subject away from the edges, and larger than they will be shown.

Always fill in **Image description** for pictures that carry meaning.

## Before launch: sample content to replace

The demo seed (`apps/backend/src/scripts/seed-demo.ts`) is for development only and refuses to run when `APP_ENV=production`. A production database that was started with the starter content alone has none of the samples below, but it also has no price list, gallery, team, reviews, phone number or opening hours. Either way, every line here has to be true before the site is public.

**What is real today:** the booking link, the address, the story text in the About section, and the hero and shop-front photographs supplied by the owner. Everything else shown locally is a sample.

Site settings

- [ ] **Phone** and **WhatsApp** are the real numbers. The sample is `050-000-0000`.
- [ ] **Email** is real. The sample is an `example.com` address.
- [ ] **Opening hours** are real. The sample ends with a line saying "Sample hours only."
- [ ] **Google rating**, **Number of Google reviews** and **Google reviews link** are the real ones, or empty. The samples are 4.9, 120 and a link to Google Maps' front page.
- [ ] **Instagram** is the business's profile. The sample is Instagram's front page.
- [ ] **Free shipping from** matches the real shipping price. The sample is ₪399.
- [ ] **Booking link** and **Address** are still correct.

Barbershop content

- [ ] **Price list:** every group, service and price is real. The samples include two "sample packages", a hidden sample service and a draft sample group.
- [ ] **Gallery:** real photographs of real work. The samples are eight grey drawings marked SAMPLE and one draft.
- [ ] **Team:** real names, photos and Instagram profiles. The samples are "Sample barber 1" to 3 and one draft.
- [ ] **Reviews:** real reviews, word for word, or none. See [Reviews](#reviews).
- [ ] **Hero photograph:** replaced with a higher-resolution original whose licence the owner has confirmed. The photograph supplied (`photos-examples/hero-img.jpg`) is 480×320 pixels. The file the site uses is 1440×960 and appears to be an enlargement of it, which adds no detail. The owner has not confirmed the licence of this photograph.
- [ ] **Academy section:** its button leads to `/academy`. With the starter content alone that page is an empty draft, so the button leads to a "not found" page. Publish the page with real text, or change the button, or hide the section.

Pages, menus and banners

- [ ] Every page has its real text. The demo seed publishes the eight starter pages with placeholder text under a notice saying so, and adds a page called `draft-example`.
- [ ] The privacy policy, terms, returns policy, shipping page and accessibility statement have been written by the business and reviewed by a professional before they are published. See [security.md](security.md#needs-professional-review).
- [ ] The sample banners are gone: a free-shipping strip, a "launch sale", an equipment banner and three test banners.
- [ ] Menu links point where they should.

Store

- [ ] The catalog holds real products with real photographs, prices and stock. The demo brands and products are invented and their pictures are generated drawings.
- [ ] Shipping prices are real. The demo ones are placeholders.
- [ ] The demo sale and the discount code `BONANZA10` are gone.
- [ ] A real payment provider is connected. See [payments-integration.md](payments-integration.md#go-live-checklist).

Languages

- [ ] The owner has reviewed every English and Arabic text: the translations of the content above, and the interface texts.

## Known limits of the content screens

These were found by reading the code on 2026-11-23. Each is a small gap between what a screen offers and what the site does.

| Screen | Limit |
|---|---|
| Home page, Hero | Its main button does not follow the Booking link in Site settings. |
| Home page sections | A new section is not placed last. |
| Home page sections | There is no field for a separate picture for phones. Banners have one. |
| Reviews | Nothing is imported from Google. The score and every review are typed by hand. |
| Translations | Changing Hebrew text does not flag its translations as out of date. |
