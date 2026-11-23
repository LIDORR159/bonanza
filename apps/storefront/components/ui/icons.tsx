import type { SVGProps } from "react"

/**
 * Line icons, drawn at 24px on a 1.6px stroke. Decorative by default: the
 * element that contains one carries the accessible name.
 */
const Icon = ({ children, ...props }: SVGProps<SVGSVGElement>) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    {children}
  </svg>
)

type Props = SVGProps<SVGSVGElement>

export const CartIcon = (props: Props) => (
  <Icon {...props}>
    <path d="M3 4h2.2l2.1 10.2a1.5 1.5 0 0 0 1.5 1.2h7.9a1.5 1.5 0 0 0 1.5-1.1L20 8H6.3" />
    <circle cx="9.5" cy="19.5" r="1.3" />
    <circle cx="17" cy="19.5" r="1.3" />
  </Icon>
)
export const SearchIcon = (props: Props) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </Icon>
)
export const UserIcon = (props: Props) => (
  <Icon {...props}>
    <circle cx="12" cy="8.5" r="3.6" />
    <path d="M5 20c.6-3.6 3.4-5.5 7-5.5s6.4 1.9 7 5.5" />
  </Icon>
)
export const MenuIcon = (props: Props) => (
  <Icon {...props}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
)
export const CloseIcon = (props: Props) => (
  <Icon {...props}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
)
export const ChevronDownIcon = (props: Props) => (
  <Icon {...props}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
)
/** Points toward the end of the line: left in Hebrew. Mirrors itself in LTR. */
export const ArrowIcon = (props: Props) => (
  <Icon {...props} className={`ltr:-scale-x-100 ${props.className ?? ""}`}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Icon>
)
export const MinusIcon = (props: Props) => (
  <Icon {...props}>
    <path d="M5 12h14" />
  </Icon>
)
export const PlusIcon = (props: Props) => (
  <Icon {...props}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)
export const TrashIcon = (props: Props) => (
  <Icon {...props}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12.2a1.5 1.5 0 0 0 1.5 1.3h7a1.5 1.5 0 0 0 1.5-1.3L18 7M9 7V4.5h6V7" />
  </Icon>
)
export const CheckIcon = (props: Props) => (
  <Icon {...props}>
    <path d="m5 12.5 4.5 4.5L19 7" />
  </Icon>
)
export const TruckIcon = (props: Props) => (
  <Icon {...props}>
    <path d="M3 6h11v10H3zM14 9h4l3 3.5V16h-7" />
    <circle cx="7" cy="17.5" r="1.8" />
    <circle cx="17.5" cy="17.5" r="1.8" />
  </Icon>
)
export const LockIcon = (props: Props) => (
  <Icon {...props}>
    <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </Icon>
)
export const FilterIcon = (props: Props) => (
  <Icon {...props}>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </Icon>
)

export const CalendarIcon = (props: Props) => (
  <Icon {...props}>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path d="M8 3v4M16 3v4M3.5 10h17" />
  </Icon>
)

export const ClockIcon = (props: Props) => (
  <Icon {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Icon>
)

export const MapPinIcon = (props: Props) => (
  <Icon {...props}>
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
    <circle cx="12" cy="10" r="2.4" />
  </Icon>
)

export const PhoneIcon = (props: Props) => (
  <Icon {...props}>
    <path d="M6.2 3.5h3l1.5 4-2 1.5a11 11 0 0 0 5.3 5.3l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.2 5.7a2 2 0 0 1 2-2.2Z" />
  </Icon>
)

export const MailIcon = (props: Props) => (
  <Icon {...props}>
    <rect x="3" y="5.5" width="18" height="13" rx="2" />
    <path d="m4 7.5 8 6 8-6" />
  </Icon>
)

export const InstagramIcon = (props: Props) => (
  <Icon {...props}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
    <circle cx="12" cy="12" r="3.8" />
    <circle cx="17" cy="7" r="0.6" fill="currentColor" />
  </Icon>
)

/** The WhatsApp mark: a speech bubble with a handset. Filled, unlike the line icons. */
export const WhatsAppIcon = (props: Props) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <path d="M12.04 2a9.9 9.9 0 0 0-8.46 15.05L2 22l5.09-1.54A9.9 9.9 0 1 0 12.04 2Zm0 1.8a8.1 8.1 0 1 1-4.3 14.97l-.3-.19-3.02.91.93-2.94-.2-.31A8.1 8.1 0 0 1 12.04 3.8Zm-3.33 3.9c-.18 0-.47.07-.72.34-.25.27-.94.92-.94 2.24s.96 2.6 1.1 2.78c.13.18 1.86 2.97 4.6 4.05 2.28.9 2.74.72 3.24.67.49-.04 1.59-.65 1.81-1.28.23-.63.23-1.16.16-1.28-.07-.11-.25-.18-.52-.31-.27-.14-1.59-.79-1.84-.88-.25-.09-.43-.13-.61.14-.18.27-.7.87-.85 1.05-.16.18-.31.2-.58.07-.27-.14-1.14-.42-2.17-1.34a8.1 8.1 0 0 1-1.5-1.87c-.16-.27-.02-.41.12-.55.12-.12.27-.31.4-.47.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.47-.07-.14-.6-1.48-.84-2.02-.22-.52-.44-.45-.61-.46Z" />
  </svg>
)

/** The international accessibility symbol. */
export const AccessibilityIcon = (props: Props) => (
  <Icon {...props}>
    <circle cx="12" cy="4.6" r="1.6" fill="currentColor" stroke="none" />
    <path d="M5 8.5c2.3.8 4.6 1.2 7 1.2s4.7-.4 7-1.2M12 9.7v5M12 14.7l-3 5.8M12 14.7l3 5.8" />
  </Icon>
)

export const StarIcon = (props: Props) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <path d="m12 2.6 2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9L12 2.6Z" />
  </svg>
)

export const ExternalIcon = (props: Props) => (
  <Icon {...props}>
    <path d="M14 4.5h5.5V10M19.5 4.5 11 13M9 6.5H6a1.5 1.5 0 0 0-1.5 1.5v10A1.5 1.5 0 0 0 6 19.5h10a1.5 1.5 0 0 0 1.5-1.5v-3" />
  </Icon>
)
