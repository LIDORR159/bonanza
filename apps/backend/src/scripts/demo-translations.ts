import type { Translated } from "./translations"

/**
 * English and Arabic text for the demo catalog and demo content, keyed the way
 * `seed-demo.ts` looks records up. Draft translations of invented products:
 * they exist so the storefront's language switch has something to show.
 *
 * Product subtitles, descriptions, options and specifications are left in
 * Hebrew, which is what the storefront falls back to.
 */

/** By brand handle. Brand names are Latin and stay as they are. */
export const BRAND_TRANSLATIONS: Record<string, Translated> = {
  stahlwerk: {
    en: { description: "Clippers and trimmers built for heavy use." },
    ar: { description: "ماكينات قص وتحديد للعمل المكثّف." },
  },
  "kiro-pro": {
    en: { description: "Precision power tools for barbers." },
    ar: { description: "أدوات كهربائية دقيقة للحلاقين." },
  },
  "volt-blade": {
    en: { description: "Strong motors and batteries that last a full working day." },
    ar: { description: "محركات قوية وبطاريات تدوم يوم عمل كامل." },
  },
  maestro: {
    en: { description: "Scissors and razors in forged steel." },
    ar: { description: "مقصات وأمواس من الفولاذ المطروق." },
  },
  nordkamm: {
    en: { description: "Combs, brushes and work accessories." },
    ar: { description: "أمشاط، فُرش وإكسسوارات للعمل." },
  },
  barbera: {
    en: { description: "Hair styling products for a professional finish." },
    ar: { description: "منتجات تصفيف شعر للمسة احترافية." },
  },
  olivo: {
    en: { description: "Beard and shaving care." },
    ar: { description: "عناية باللحية والحلاقة." },
  },
  "atelier-noir": {
    en: { description: "Furniture and equipment for the barber station." },
    ar: { description: "أثاث ومعدات لمحطة الحلاق." },
  },
}

/** Product titles, by product handle: [English, Arabic]. */
export const PRODUCT_TITLES: Record<string, [en: string, ar: string]> = {
  "stahlwerk-x1-cordless-clipper": ["Stahlwerk X1 Cordless Clipper", "ماكينة قص الشعر Stahlwerk X1 اللاسلكية"],
  "kiro-pro-fade-master-clipper": ["Kiro Pro Fade Master Clipper", "ماكينة قص الشعر Kiro Pro Fade Master"],
  "volt-blade-v8-clipper": ["Volt & Blade V8 Clipper", "ماكينة قص الشعر Volt & Blade V8"],
  "stahlwerk-classic-corded-clipper": ["Stahlwerk Classic Corded Clipper", "ماكينة قص الشعر Stahlwerk Classic السلكية"],
  "stahlwerk-t-line-trimmer": ["Stahlwerk T-Line Trimmer", "ماكينة تحديد Stahlwerk T-Line"],
  "kiro-pro-detail-gold-trimmer": ["Kiro Pro Detail Gold Trimmer", "ماكينة تحديد Kiro Pro Detail Gold"],
  "volt-blade-zero-gap-trimmer": ["Volt & Blade Zero Gap Trimmer", "ماكينة تحديد Volt & Blade Zero Gap"],
  "kiro-pro-mini-trimmer": ["Kiro Pro Mini Trimmer", "ماكينة تحديد Kiro Pro Mini"],
  "kiro-pro-foil-s2-shaver": ["Kiro Pro Foil S2 Shaver", "ماكينة حلاقة Kiro Pro Foil S2"],
  "stahlwerk-titan-foil-shaver": ["Stahlwerk Titan Foil Shaver", "ماكينة حلاقة Stahlwerk Titan Foil"],
  "volt-blade-finish-shaver": ["Volt & Blade Finish Shaver", "ماكينة حلاقة Volt & Blade Finish"],
  "maestro-cutting-scissors": ["Maestro Cutting Scissors", "مقص قص Maestro"],
  "maestro-thinning-scissors": ["Maestro Thin Thinning Scissors", "مقص تخفيف Maestro Thin"],
  "nordkamm-duo-scissor-set": ["Nordkamm Duo Scissor Set", "طقم مقصات Nordkamm Duo"],
  "maestro-straight-razor": ["Maestro Straight Razor", "موس حلاقة Maestro Straight"],
  "barbera-matte-clay": ["Barbera Matte Clay Wax", "واكس مطفي Barbera Matte Clay"],
  "barbera-classic-shine-pomade": ["Barbera Classic Shine Pomade", "بوميد Barbera Classic Shine"],
  "barbera-fiber-paste": ["Barbera Fiber Paste", "معجون تصفيف Barbera Fiber Paste"],
  "barbera-sea-salt-spray": ["Barbera Sea Salt Spray", "بخاخ ملح البحر Barbera Sea Salt"],
  "barbera-strong-hold-spray": ["Barbera Strong Hold Hairspray", "بخاخ تثبيت Barbera Strong Hold"],
  "barbera-volume-powder": ["Barbera Volume Powder", "بودرة تكثيف Barbera Volume Powder"],
  "olivo-beard-oil": ["Olivo Beard Oil", "زيت اللحية Olivo"],
  "olivo-soft-beard-balm": ["Olivo Soft Beard Balm", "بلسم اللحية Olivo Soft Balm"],
  "olivo-beard-wash": ["Olivo Beard Wash", "شامبو اللحية Olivo Wash"],
  "olivo-shave-cream": ["Olivo Shave Cream", "كريم حلاقة Olivo Shave Cream"],
  "olivo-classic-shaving-brush": ["Olivo Classic Shaving Brush", "فرشاة حلاقة Olivo Classic"],
  "nordkamm-carbon-cutting-comb": ["Nordkamm Carbon Cutting Comb", "مشط قص Nordkamm Carbon"],
  "nordkamm-fade-comb": ["Nordkamm Fade Comb", "مشط فيد Nordkamm Fade"],
  "nordkamm-neck-duster": ["Nordkamm Neck Duster Brush", "فرشاة الرقبة Nordkamm Neck Duster"],
  "nordkamm-pro-cape": ["Nordkamm Pro Cutting Cape", "مريلة حلاقة Nordkamm Pro Cape"],
  "stahlwerk-guard-set": ["Stahlwerk Guard Set", "طقم أمشاط قياس Stahlwerk"],
  "nordkamm-hand-mirror": ["Nordkamm Hand Mirror", "مرآة يد Nordkamm"],
  "atelier-noir-heritage-barber-chair": ["Atelier Noir Heritage Barber Chair", "كرسي حلاقة Atelier Noir Heritage"],
  "atelier-noir-regent-barber-chair": ["Atelier Noir Regent Barber Chair", "كرسي حلاقة Atelier Noir Regent"],
  "volt-blade-airflow-dryer": ["Volt & Blade Airflow Professional Dryer", "مجفف شعر احترافي Volt & Blade Airflow"],
  "volt-blade-compact-dryer": ["Volt & Blade Compact Dryer", "مجفف شعر صغير Volt & Blade Compact"],
  "atelier-noir-tool-case": ["Atelier Noir Tool Case", "حقيبة أدوات Atelier Noir"],
}

const NOTICE = {
  en: "> **Sample text.** This page was created automatically for the development environment. The real content is written in the admin, and policy and terms pages need legal review before they are published.",
  ar: "> **نص نموذجي.** أُنشئت هذه الصفحة تلقائيًا لبيئة التطوير. المحتوى الحقيقي يُكتب في لوحة الإدارة، وصفحات السياسات والشروط تحتاج إلى مراجعة قانونية قبل نشرها.",
}

const body = (en: string, ar: string): Translated => ({
  en: { body: `${NOTICE.en}\n\n${en}` },
  ar: { body: `${NOTICE.ar}\n\n${ar}` },
})

/** Placeholder page text, by page slug. */
export const PAGE_BODY_TRANSLATIONS: Record<string, Translated> = {
  about: body(
    "## Who we are\n\nBONANZA is a barbershop and a barber academy, and now also a shop for professional equipment. The story of the business will appear here.",
    "## من نحن\n\nBONANZA صالون حلاقة وأكاديمية للحلاقين، والآن أيضًا متجر للمعدات الاحترافية. هنا ستظهر قصة المكان."
  ),
  contact: body(
    "## Talk to us\n\nContact details will appear here: phone, WhatsApp, address and opening hours.",
    "## تواصلوا معنا\n\nهنا ستظهر تفاصيل الاتصال: الهاتف، واتساب، العنوان وساعات العمل."
  ),
  academy: body(
    "## BONANZA ACADEMY\n\nInformation about the courses and workshops will appear here: who they are for, what is taught and how to sign up.",
    "## BONANZA ACADEMY\n\nهنا ستظهر معلومات عن الدورات وورش العمل: لمن تناسب، ماذا يُدرَّس وكيف يتم التسجيل."
  ),
  shipping: body(
    "## Shipping\n\nThe shipping options, delivery times and actual prices will appear here.",
    "## الشحن\n\nهنا ستظهر خيارات الشحن، مدة التوصيل والأسعار الفعلية."
  ),
  returns: body(
    "## Returns & cancellations\n\nThe cancellation and returns policy will appear here.",
    "## الإرجاع والإلغاء\n\nهنا ستظهر سياسة الإلغاء والإرجاع."
  ),
  privacy: body(
    "## Privacy policy\n\nThe privacy policy will appear here.",
    "## سياسة الخصوصية\n\nهنا ستظهر سياسة الخصوصية."
  ),
  terms: body(
    "## Terms of use\n\nThe site's terms of use will appear here.",
    "## شروط الاستخدام\n\nهنا ستظهر شروط استخدام الموقع."
  ),
  accessibility: body(
    "## Accessibility statement\n\nThe site's accessibility statement and the accessibility coordinator's details will appear here.",
    "## بيان إمكانية الوصول\n\nهنا سيظهر بيان إمكانية الوصول للموقع وتفاصيل منسّق إمكانية الوصول."
  ),
}
