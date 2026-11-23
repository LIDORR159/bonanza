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
