/**
 * The demo catalog: invented brands and products for development and testing.
 * None of these are real products or real brands, and none of the prices or
 * stock levels mean anything.
 */

export const DEMO_BRANDS = [
  { handle: "stahlwerk", name: "Stahlwerk", description: "מכונות תספורת וטרימרים לעבודה אינטנסיבית.", is_featured: true },
  { handle: "kiro-pro", name: "Kiro Pro", description: "כלי חשמל מדויקים לספרים.", is_featured: true },
  { handle: "volt-blade", name: "Volt & Blade", description: "מנועים חזקים וסוללות לאורך יום עבודה מלא.", is_featured: true },
  { handle: "maestro", name: "Maestro", description: "מספריים ותערים מפלדה מחושלת.", is_featured: true },
  { handle: "nordkamm", name: "Nordkamm", description: "מסרקים, מברשות ואביזרי עבודה.", is_featured: true },
  { handle: "barbera", name: "Barbera", description: "מוצרי עיצוב שיער לגימור מקצועי.", is_featured: true },
  { handle: "olivo", name: "Olivo", description: "טיפוח לזקן ולגילוח.", is_featured: true },
  { handle: "atelier-noir", name: "Atelier Noir", description: "ריהוט וציוד לעמדת הספר.", is_featured: true },
] as const

/**
 * Options shared by several products. Medusa requires every product to have at
 * least one option, so products sold in a single version use `standard`; the
 * storefront shows no selector for an option that has only one value.
 */
export const DEMO_OPTIONS = {
  standard: { title: "גרסה", values: ["סטנדרט"] },
  finish: { title: "גימור", values: ["כסוף", "זהב"] },
  size: { title: "אורך", values: ['5.5"', '6"', '6.5"'] },
  scent: { title: "ניחוח", values: ["ארז", "סנדלווד"] },
  teeth: { title: "צפיפות שיניים", values: ["עדין", "רחב"] },
} as const

type OptionKey = keyof typeof DEMO_OPTIONS

export type DemoVariant = {
  /** Suffix added to the product SKU. */
  sku: string
  value?: string
  price: number
  /** Promotional price. Goes into the sale price list. */
  sale?: number
  stock: number
  /** Image file in seed-assets, without extension. Defaults to the product's. */
  image?: string
}

export type DemoProduct = {
  handle: string
  title: string
  subtitle?: string
  description: string
  category: string
  brand: string
  image: string
  sku: string
  option?: OptionKey
  variants: DemoVariant[]
  tags?: ("featured" | "best-seller")[]
  /** Shown in the specifications table. */
  specs?: Record<string, string>
  weight?: number
}

const one = (price: number, stock = 25, sale?: number): DemoVariant[] => [
  { sku: "STD", value: "סטנדרט", price, stock, sale },
]

export const DEMO_PRODUCTS: DemoProduct[] = [
  // ── Clippers ──────────────────────────────────────────────────────────────
  {
    handle: "stahlwerk-x1-cordless-clipper", title: "מכונת תספורת Stahlwerk X1 אלחוטית", subtitle: "מנוע רוטורי, 180 דקות עבודה",
    description: "מכונת תספורת אלחוטית לעבודה רציפה במספרה. מנוע רוטורי שקט, סכין פלדה מתכווננת וסוללת ליתיום ל-180 דקות עבודה.",
    category: "clippers", brand: "stahlwerk", image: "clipper-silver", sku: "BNZ-CLP-001", option: "finish",
    variants: [
      { sku: "SLV", value: "כסוף", price: 649, stock: 18, image: "clipper-silver" },
      { sku: "GLD", value: "זהב", price: 679, stock: 7, image: "clipper-gold" },
    ],
    tags: ["featured", "best-seller"], weight: 310,
    specs: { "מנוע": "רוטורי, 7,200 סל״ד", "סוללה": "ליתיום, 180 דקות", "זמן טעינה": "90 דקות", "סכין": "פלדת פחמן, מתכווננת", "אחריות": "שנתיים" },
  },
  {
    handle: "kiro-pro-fade-master-clipper", title: "מכונת תספורת Kiro Pro Fade Master", subtitle: "סכין פייד רחבה",
    description: "מכונה ייעודית לעבודות פייד עם סכין רחבה ומנוף כוונון ארוך למעברים חלקים.",
    category: "clippers", brand: "kiro-pro", image: "clipper-red", sku: "BNZ-CLP-002", variants: one(549, 12, 469), weight: 295,
    specs: { "מנוע": "מגנטי, 9,000 סל״ד", "סוללה": "ליתיום, 120 דקות", "סכין": "פייד, 40 מ״מ" },
  },
  {
    handle: "volt-blade-v8-clipper", title: "מכונת תספורת Volt & Blade V8", subtitle: "מומנט גבוה לשיער עבה",
    description: "מנוע בעל מומנט גבוה שלא מאט בשיער עבה. גוף מתכת מאוזן וסוללה ל-240 דקות.",
    category: "clippers", brand: "volt-blade", image: "clipper-steel", sku: "BNZ-CLP-003", variants: one(799, 9), tags: ["featured"], weight: 340,
    specs: { "מנוע": "ללא פחמים, 7,500 סל״ד", "סוללה": "ליתיום, 240 דקות", "גוף": "אלומיניום" },
  },
  {
    handle: "stahlwerk-classic-corded-clipper", title: "מכונת תספורת Stahlwerk Classic חוטית", subtitle: "עבודה ללא הפסקה",
    description: "מכונה חוטית קלאסית לעבודה רציפה לאורך כל היום. כבל באורך 3 מטרים.",
    category: "clippers", brand: "stahlwerk", image: "clipper-gold", sku: "BNZ-CLP-004", variants: one(389, 30), weight: 420,
    specs: { "מנוע": "מגנטי", "כבל": "3 מ׳", "סכין": "פלדת פחמן" },
  },

  // ── Trimmers ──────────────────────────────────────────────────────────────
  {
    handle: "stahlwerk-t-line-trimmer", title: "טרימר Stahlwerk T-Line", subtitle: "סכין T לקווים חדים",
    description: "טרימר עם סכין T רחבה לקווי מתאר, עיצוב זקן וגימורים מדויקים.",
    category: "trimmers", brand: "stahlwerk", image: "trimmer-silver", sku: "BNZ-TRM-001", variants: one(429, 22), tags: ["best-seller"], weight: 180,
    specs: { "סכין": "T, 40 מ״מ", "סוללה": "ליתיום, 150 דקות", "משקל": "180 גרם" },
  },
  {
    handle: "kiro-pro-detail-gold-trimmer", title: "טרימר Kiro Pro Detail Gold", subtitle: "סכין מצופה טיטניום",
    description: "טרימר דיוק עם סכין מצופה טיטניום שנשארת חדה לאורך זמן.",
    category: "trimmers", brand: "kiro-pro", image: "trimmer-gold", sku: "BNZ-TRM-002", variants: one(479, 14), tags: ["featured"], weight: 175,
    specs: { "סכין": "T, ציפוי טיטניום", "סוללה": "ליתיום, 120 דקות" },
  },
  {
    handle: "volt-blade-zero-gap-trimmer", title: "טרימר Volt & Blade Zero Gap", subtitle: "מכוונן לאפס מהקופסה",
    description: "טרימר שמגיע מכוונן לאפס לגימור צמוד במיוחד, ללא צורך בכוונון ידני.",
    category: "trimmers", brand: "volt-blade", image: "trimmer-copper", sku: "BNZ-TRM-003", variants: one(519, 8, 449), weight: 190,
    specs: { "סכין": "T, Zero Gap", "סוללה": "ליתיום, 180 דקות" },
  },
  {
    handle: "kiro-pro-mini-trimmer", title: "טרימר Kiro Pro Mini", subtitle: "קומפקטי לתיק העבודה",
    description: "טרימר קומפקטי וקל לגימורים קטנים ולעבודה מחוץ למספרה.",
    category: "trimmers", brand: "kiro-pro", image: "trimmer-silver", sku: "BNZ-TRM-004", variants: one(249, 3), weight: 120,
    specs: { "סוללה": "ליתיום, 90 דקות", "טעינה": "USB-C" },
  },

  // ── Shavers ───────────────────────────────────────────────────────────────
  {
    handle: "kiro-pro-foil-s2-shaver", title: "מכונת גילוח Kiro Pro Foil S2", subtitle: "שתי רשתות לגימור חלק",
    description: "מכונת גילוח עם שתי רשתות היפואלרגניות לגימור חלק אחרי פייד.",
    category: "shavers", brand: "kiro-pro", image: "shaver-silver", sku: "BNZ-SHV-001", variants: one(399, 20), tags: ["best-seller"], weight: 160,
    specs: { "רשתות": "שתיים, היפואלרגניות", "סוללה": "ליתיום, 120 דקות" },
  },
  {
    handle: "stahlwerk-titan-foil-shaver", title: "מכונת גילוח Stahlwerk Titan Foil", subtitle: "רשת טיטניום",
    description: "רשתות טיטניום עמידות ומנוע מהיר לגילוח נקי במעבר אחד.",
    category: "shavers", brand: "stahlwerk", image: "shaver-gold", sku: "BNZ-SHV-002", variants: one(459, 11), weight: 170,
    specs: { "רשתות": "טיטניום", "מנוע": "10,000 סל״ד" },
  },
  {
    handle: "volt-blade-finish-shaver", title: "מכונת גילוח Volt & Blade Finish", subtitle: "לגימור יומיומי",
    description: "מכונת גילוח קלה ונוחה לגימור יומיומי ולניקוי קווי הצוואר.",
    category: "shavers", brand: "volt-blade", image: "shaver-steel", sku: "BNZ-SHV-003", variants: one(349, 16, 299), weight: 150,
    specs: { "רשתות": "שתיים", "סוללה": "ליתיום, 90 דקות" },
  },

  // ── Scissors ──────────────────────────────────────────────────────────────
  {
    handle: "maestro-cutting-scissors", title: "מספרי תספורת Maestro", subtitle: "פלדה יפנית מחושלת",
    description: "מספרי תספורת מפלדה מחושלת עם בורג מתכוונן ואחיזה מאוזנת לעבודה ממושכת.",
    category: "scissors", brand: "maestro", image: "scissors-silver", sku: "BNZ-SCS-001", option: "size",
    variants: [
      { sku: "55", value: '5.5"', price: 329, stock: 10 },
      { sku: "60", value: '6"', price: 349, stock: 15 },
      { sku: "65", value: '6.5"', price: 369, stock: 0 },
    ],
    tags: ["featured"], weight: 60,
    specs: { "חומר": "פלדת אל-חלד מחושלת", "קשיות": "58–60 HRC", "אחיזה": "אופסט" },
  },
  {
    handle: "maestro-thinning-scissors", title: "מספרי דילול Maestro Thin", subtitle: "30 שיניים",
    description: "מספרי דילול עם 30 שיניים לדילול אחיד ולריכוך קווי מעבר.",
    category: "scissors", brand: "maestro", image: "scissors-gold", sku: "BNZ-SCS-002", variants: one(379, 13), weight: 62,
    specs: { "שיניים": "30", "אורך": '6"', "חומר": "פלדת אל-חלד מחושלת" },
  },
  {
    handle: "nordkamm-duo-scissor-set", title: "סט מספריים Nordkamm Duo", subtitle: "תספורת ודילול בנרתיק",
    description: "זוג מספריים, תספורת ודילול, בנרתיק עור עם מטלית ניקוי ושמן.",
    category: "scissors", brand: "nordkamm", image: "scissors-copper", sku: "BNZ-SCS-003", variants: one(599, 6, 499), weight: 180,
    specs: { "בסט": "מספרי תספורת, מספרי דילול, נרתיק", "אורך": '6"' },
  },
  {
    handle: "maestro-straight-razor", title: "תער גילוח Maestro Straight", subtitle: "להב מתחלף",
    description: "תער ספרים עם מנגנון להב מתחלף וידית מאוזנת.",
    category: "scissors", brand: "maestro", image: "razor-silver", sku: "BNZ-RZR-001", option: "finish",
    variants: [
      { sku: "SLV", value: "כסוף", price: 189, stock: 24, image: "razor-silver" },
      { sku: "GLD", value: "זהב", price: 199, stock: 9, image: "razor-gold" },
    ],
    weight: 55, specs: { "להב": "מתחלף, חצי סכין", "ידית": "שרף" },
  },

  // ── Styling ───────────────────────────────────────────────────────────────
  {
    handle: "barbera-matte-clay", title: "ווקס מט Barbera Matte Clay", subtitle: "100 מ״ל, אחיזה חזקה",
    description: "חימר עיצוב במראה מט עם אחיזה חזקה שמחזיקה לאורך היום ונשטפת בקלות.",
    category: "styling", brand: "barbera", image: "jar-silver", sku: "BNZ-STY-001", variants: one(69, 60), tags: ["best-seller"], weight: 130,
    specs: { "נפח": "100 מ״ל", "אחיזה": "חזקה", "גימור": "מט" },
  },
  {
    handle: "barbera-classic-shine-pomade", title: "פומייד Barbera Classic Shine", subtitle: "100 מ״ל, ברק גבוה",
    description: "פומייד על בסיס מים לתסרוקות קלאסיות, עם ברק גבוה ואחיזה בינונית.",
    category: "styling", brand: "barbera", image: "jar-gold", sku: "BNZ-STY-002", variants: one(69, 45), weight: 130,
    specs: { "נפח": "100 מ״ל", "אחיזה": "בינונית", "גימור": "ברק גבוה" },
  },
  {
    handle: "barbera-fiber-paste", title: "משחת עיצוב Barbera Fiber Paste", subtitle: "100 מ״ל, מרקם וסיבים",
    description: "משחה סיבית שמוסיפה מרקם ועובי לשיער, עם גימור טבעי.",
    category: "styling", brand: "barbera", image: "jar-red", sku: "BNZ-STY-003", variants: one(75, 38), tags: ["featured"], weight: 130,
    specs: { "נפח": "100 מ״ל", "אחיזה": "חזקה", "גימור": "טבעי" },
  },
  {
    handle: "barbera-sea-salt-spray", title: "ספריי מלח Barbera Sea Salt", subtitle: "200 מ״ל",
    description: "ספריי מלח ים לנפח ומרקם לפני ייבוש.",
    category: "styling", brand: "barbera", image: "spray-silver", sku: "BNZ-STY-004", variants: one(79, 27), weight: 230,
    specs: { "נפח": "200 מ״ל", "שימוש": "לפני ייבוש" },
  },
  {
    handle: "barbera-strong-hold-spray", title: "ספריי קיבוע Barbera Strong Hold", subtitle: "400 מ״ל",
    description: "ספריי קיבוע חזק לגימור התסרוקת, ללא שאריות לבנות.",
    category: "styling", brand: "barbera", image: "spray-gold", sku: "BNZ-STY-005", variants: one(59, 50, 45), weight: 420,
    specs: { "נפח": "400 מ״ל", "אחיזה": "חזקה מאוד" },
  },
  {
    handle: "barbera-volume-powder", title: "פודרה לנפח Barbera Volume Powder", subtitle: "20 גרם",
    description: "פודרה קלה לנפח מיידי בשורשים ולמראה מט.",
    category: "styling", brand: "barbera", image: "jar-copper", sku: "BNZ-STY-006", variants: one(65, 33), weight: 40,
    specs: { "משקל נטו": "20 גרם", "גימור": "מט" },
  },

  // ── Beard care ────────────────────────────────────────────────────────────
  {
    handle: "olivo-beard-oil", title: "שמן לזקן Olivo", subtitle: "30 מ״ל",
    description: "שמן קל לזקן שמרכך את השיער ומזין את העור שמתחתיו.",
    category: "beard-care", brand: "olivo", image: "dropper-gold", sku: "BNZ-BRD-001", option: "scent",
    variants: [
      { sku: "CDR", value: "ארז", price: 89, stock: 40, image: "dropper-gold" },
      { sku: "SND", value: "סנדלווד", price: 89, stock: 28, image: "dropper-silver" },
    ],
    tags: ["best-seller"], weight: 90, specs: { "נפח": "30 מ״ל", "בסיס": "שמן ארגן וחוחובה" },
  },
  {
    handle: "olivo-soft-beard-balm", title: "באלם לזקן Olivo Soft Balm", subtitle: "60 מ״ל",
    description: "באלם שמעצב את הזקן, מרכך אותו ומשאיר ריח עדין.",
    category: "beard-care", brand: "olivo", image: "jar-gold", sku: "BNZ-BRD-002", variants: one(79, 31), weight: 90,
    specs: { "נפח": "60 מ״ל", "אחיזה": "קלה" },
  },
  {
    handle: "olivo-beard-wash", title: "שמפו לזקן Olivo Wash", subtitle: "150 מ״ל",
    description: "שמפו עדין לזקן שמנקה בלי לייבש את העור.",
    category: "beard-care", brand: "olivo", image: "tube-silver", sku: "BNZ-BRD-003", variants: one(59, 42), weight: 170,
    specs: { "נפח": "150 מ״ל" },
  },
  {
    handle: "olivo-shave-cream", title: "קרם גילוח Olivo Shave Cream", subtitle: "150 מ״ל",
    description: "קרם גילוח עשיר שמקציף היטב ומגן על העור בזמן הגילוח.",
    category: "beard-care", brand: "olivo", image: "tube-red", sku: "BNZ-BRD-004", variants: one(55, 36), weight: 170,
    specs: { "נפח": "150 מ״ל" },
  },
  {
    handle: "olivo-classic-shaving-brush", title: "מברשת גילוח Olivo Classic", subtitle: "סיבים סינתטיים",
    description: "מברשת גילוח עם סיבים סינתטיים רכים וידית שרף.",
    category: "beard-care", brand: "olivo", image: "brush-gold", sku: "BNZ-BRD-005", variants: one(129, 17), weight: 110,
    specs: { "סיבים": "סינתטיים", "ידית": "שרף" },
  },

  // ── Accessories ───────────────────────────────────────────────────────────
  {
    handle: "nordkamm-carbon-cutting-comb", title: "מסרק חיתוך Nordkamm Carbon", subtitle: "אנטי-סטטי, עמיד בחום",
    description: "מסרק קרבון אנטי-סטטי ועמיד בחום, לעבודה עם מספריים ומכונה.",
    category: "accessories", brand: "nordkamm", image: "comb-silver", sku: "BNZ-ACC-001", option: "teeth",
    variants: [
      { sku: "FIN", value: "עדין", price: 39, stock: 80 },
      { sku: "WID", value: "רחב", price: 39, stock: 64 },
    ],
    weight: 25, specs: { "חומר": "קרבון", "עמידות בחום": "עד 230°C" },
  },
  {
    handle: "nordkamm-fade-comb", title: "מסרק פייד Nordkamm Fade", subtitle: "שטוח במיוחד",
    description: "מסרק שטוח לעבודות פייד עם מכונה מעל המסרק.",
    category: "accessories", brand: "nordkamm", image: "comb-gold", sku: "BNZ-ACC-002", variants: one(45, 55), weight: 22,
    specs: { "חומר": "קרבון" },
  },
  {
    handle: "nordkamm-neck-duster", title: "מברשת צוואר Nordkamm Neck Duster", subtitle: "סיבים רכים",
    description: "מברשת רכה להסרת שיער מהצוואר והכתפיים בסוף התספורת.",
    category: "accessories", brand: "nordkamm", image: "brush-silver", sku: "BNZ-ACC-003", variants: one(59, 26), weight: 95,
    specs: { "סיבים": "סינתטיים רכים" },
  },
  {
    handle: "nordkamm-pro-cape", title: "סינר תספורת Nordkamm Pro Cape", subtitle: "דוחה מים ושיער",
    description: "סינר תספורת קל שדוחה מים ושיער, עם סגירת צוואר מתכווננת.",
    category: "accessories", brand: "nordkamm", image: "cape-silver", sku: "BNZ-ACC-004", variants: one(119, 21), weight: 260,
    specs: { "בד": "פוליאסטר דוחה מים", "מידות": "150×130 ס״מ" },
  },
  {
    handle: "stahlwerk-guard-set", title: "סט מסרקי אורך Stahlwerk", subtitle: "8 יחידות, מגנטיים",
    description: "שמונה מסרקי אורך מגנטיים למכונות תספורת, מ-1.5 מ״מ ועד 25 מ״מ.",
    category: "accessories", brand: "stahlwerk", image: "guards-silver", sku: "BNZ-ACC-005", variants: one(69, 34), weight: 140,
    specs: { "בסט": "8 יחידות", "חיבור": "מגנטי" },
  },
  {
    handle: "nordkamm-hand-mirror", title: "מראת יד Nordkamm", subtitle: "להצגת התספורת",
    description: "מראת יד עגולה להצגת גב התספורת ללקוח.",
    category: "accessories", brand: "nordkamm", image: "mirror-gold", sku: "BNZ-ACC-006", variants: one(89, 12), weight: 380,
    specs: { "קוטר": "25 ס״מ" },
  },

  // ── Professional equipment ────────────────────────────────────────────────
  {
    handle: "atelier-noir-heritage-barber-chair", title: "כיסא ספר Atelier Noir Heritage", subtitle: "הידראולי, משענת נשכבת",
    description: "כיסא ספר קלאסי עם משאבה הידראולית, משענת נשכבת ומשענת ראש נשלפת.",
    category: "professional-equipment", brand: "atelier-noir", image: "chair-silver", sku: "BNZ-PRO-001", variants: one(4890, 4), tags: ["featured"], weight: 62000,
    specs: { "הגבהה": "הידראולית", "משענת": "נשכבת עד 135°", "ריפוד": "דמוי עור", "עומס מרבי": "180 ק״ג" },
  },
  {
    handle: "atelier-noir-regent-barber-chair", title: "כיסא ספר Atelier Noir Regent", subtitle: "גימור זהב",
    description: "כיסא ספר רחב עם פרזול בגימור זהב, משענת נשכבת ומשענת רגליים מתקפלת.",
    category: "professional-equipment", brand: "atelier-noir", image: "chair-gold", sku: "BNZ-PRO-002", variants: one(5690, 2), weight: 68000,
    specs: { "הגבהה": "הידראולית", "משענת": "נשכבת עד 140°", "פרזול": "גימור זהב" },
  },
  {
    handle: "volt-blade-airflow-dryer", title: "פן מקצועי Volt & Blade Airflow", subtitle: "2,200 וואט",
    description: "פן מקצועי עם מנוע AC, שלוש דרגות חום ושתי מהירויות.",
    category: "professional-equipment", brand: "volt-blade", image: "dryer-silver", sku: "BNZ-PRO-003", variants: one(549, 10, 479), weight: 560,
    specs: { "הספק": "2,200 וואט", "מנוע": "AC", "כבל": "3 מ׳" },
  },
  {
    handle: "volt-blade-compact-dryer", title: "פן קומפקטי Volt & Blade Compact", subtitle: "1,800 וואט",
    description: "פן קל וקומפקטי לעבודה ממושכת בלי עומס על שורש כף היד.",
    category: "professional-equipment", brand: "volt-blade", image: "dryer-copper", sku: "BNZ-PRO-004", variants: one(329, 19), weight: 390,
    specs: { "הספק": "1,800 וואט", "משקל": "390 גרם" },
  },
  {
    handle: "atelier-noir-tool-case", title: "מזוודת ציוד Atelier Noir", subtitle: "לספר הנייד",
    description: "מזוודת אלומיניום קשיחה עם חלוקה פנימית למכונות, מספריים ומוצרים.",
    category: "professional-equipment", brand: "atelier-noir", image: "case-silver", sku: "BNZ-PRO-005", variants: one(459, 8), weight: 2800,
    specs: { "חומר": "אלומיניום", "מידות": "36×24×22 ס״מ", "נעילה": "קוד" },
  },
]
