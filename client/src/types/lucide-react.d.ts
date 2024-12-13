declare module 'lucide-react' {
  import { FC, SVGProps } from 'react';

  export interface LucideProps extends SVGProps<SVGElement> {
    size?: string | number;
    absoluteStrokeWidth?: boolean;
  }

  export type LucideIcon = FC<LucideProps>;

  // Core Icons
  export const AlertCircle: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const Book: LucideIcon;
  export const BookOpen: LucideIcon;
  export const Calendar: LucideIcon;
  export const Check: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const ChevronLeft: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const ChevronUp: LucideIcon;
  export const Circle: LucideIcon;
  export const Dot: LucideIcon;
  export const FolderOpen: LucideIcon;
  export const Globe: LucideIcon;
  export const GripVertical: LucideIcon;
  export const Heart: LucideIcon;
  export const Instagram: LucideIcon;
  export const Link: LucideIcon;
  export const Link2: LucideIcon;
  export const Loader2: LucideIcon;
  export const MapPin: LucideIcon;
  export const Menu: LucideIcon;
  export const MoreHorizontal: LucideIcon;
  export const PanelLeft: LucideIcon;
  export const Pencil: LucideIcon;
  export const Phone: LucideIcon;
  export const Plus: LucideIcon;
  export const RefreshCw: LucideIcon;
  export const Send: LucideIcon;
  export const Video: LucideIcon;
  export const X: LucideIcon;
  export const Zap: LucideIcon;
}