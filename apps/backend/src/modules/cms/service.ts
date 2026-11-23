import { MedusaService } from "@medusajs/framework/utils"
import Banner from "./models/banner"
import ContentPage from "./models/content-page"
import HomepageSection from "./models/homepage-section"
import NavigationItem from "./models/navigation-item"
import NewsletterSubscriber from "./models/newsletter-subscriber"
import SiteSetting from "./models/site-setting"

class CmsModuleService extends MedusaService({
  HomepageSection,
  Banner,
  ContentPage,
  NavigationItem,
  SiteSetting,
  NewsletterSubscriber,
}) {}

export default CmsModuleService
