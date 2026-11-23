import { MedusaService } from "@medusajs/framework/utils"
import Banner from "./models/banner"
import ContentPage from "./models/content-page"
import GalleryItem from "./models/gallery-item"
import HomepageSection from "./models/homepage-section"
import NavigationItem from "./models/navigation-item"
import NewsletterSubscriber from "./models/newsletter-subscriber"
import Review from "./models/review"
import ServiceGroup from "./models/service-group"
import ServiceItem from "./models/service-item"
import SiteSetting from "./models/site-setting"
import TeamMember from "./models/team-member"

class CmsModuleService extends MedusaService({
  HomepageSection,
  Banner,
  ContentPage,
  NavigationItem,
  SiteSetting,
  NewsletterSubscriber,
  ServiceGroup,
  ServiceItem,
  GalleryItem,
  TeamMember,
  Review,
}) {}

export default CmsModuleService
