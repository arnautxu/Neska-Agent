import {
  Archive,
  AtSign,
  Bell,
  Brain,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Download,
  Eye,
  FileText,
  Folder,
  History,
  House,
  LogOut,
  PanelLeft,
  PanelLeftClose,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Square,
  SquarePen,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import type { ElementType } from 'react';
import { TriggerIcon } from './trigger-icon';
import { ArchiveIcon } from './archive';
import { AtSignIcon } from './at-sign';
import { AttachFileIcon } from './attach-file';
import { BellIcon } from './bell';
import { BrainIcon } from './brain';
import { CopyIcon } from './copy';
import { DeleteIcon } from './delete';
import { DownloadIcon } from './download';
import { HistoryIcon } from './history';
import { LogoutIcon } from './logout';
import { PanelLeftCloseIcon } from './panel-left-close';
import { PlusIcon } from './plus';
import { RefreshCWIcon } from './refresh-cw';
import { SearchIcon } from './search';
import { SettingsIcon } from './settings';
import { SquarePenIcon } from './square-pen';
import { UploadIcon } from './upload';
import {
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  CrossIcon,
  EyeIcon,
  FileTextIcon,
  FolderIcon,
  HomeIcon,
  SendArrowIcon,
  StopSquareIcon,
} from './neska-animated-icons';

type AnimatedIcon = Parameters<typeof TriggerIcon>[0]['icon'];

/**
 * Neska: each lucide glyph LibreChat draws, mapped to the animated version from the
 * Neska design (lucide-animated plus Neska's own). An icon plays once when the button,
 * link or menu item around it is hovered or focused, and stays still under
 * prefers-reduced-motion. Glyphs without an animated twin keep the static lucide icon.
 */
const ANIMATED = new Map<unknown, AnimatedIcon>([
  [Archive, ArchiveIcon],
  [AtSign, AtSignIcon],
  [Bell, BellIcon],
  [Brain, BrainIcon],
  [Check, CheckIcon],
  [ChevronDown, ChevronDownIcon],
  [Clock, ClockIcon],
  [Copy, CopyIcon],
  [Download, DownloadIcon],
  [Eye, EyeIcon],
  [FileText, FileTextIcon],
  [Folder, FolderIcon],
  [History, HistoryIcon],
  [House, HomeIcon],
  [LogOut, LogoutIcon],
  [PanelLeft, PanelLeftCloseIcon],
  [PanelLeftClose, PanelLeftCloseIcon],
  [Paperclip, AttachFileIcon],
  [Plus, PlusIcon],
  [RefreshCw, RefreshCWIcon],
  [Search, SearchIcon],
  [Settings, SettingsIcon],
  [Square, StopSquareIcon],
  [SquarePen, SquarePenIcon],
  [Trash2, DeleteIcon],
  [Upload, UploadIcon],
  [X, CrossIcon],
]);

export function hasAnimatedIcon(icon: unknown): boolean {
  return ANIMATED.has(icon);
}

/** Draws `icon` animated when Neska has a twin for it, otherwise as the plain lucide icon. */
export function NeskaIcon({
  icon: Icon,
  size = 20,
  className,
}: {
  icon: ElementType;
  size?: number;
  className?: string;
}) {
  const animated = ANIMATED.get(Icon);
  if (animated) {
    return <TriggerIcon icon={animated} size={size} className={className} />;
  }
  return <Icon className={className} aria-hidden="true" />;
}

/** Send: Neska's arrow nudge, turned to point up like LibreChat's send button. */
export function NeskaSendIcon({ size = 20, className }: { size?: number; className?: string }) {
  return <TriggerIcon icon={SendArrowIcon} size={size} className={`-rotate-90 ${className ?? ''}`} />;
}

