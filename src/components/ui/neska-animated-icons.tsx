"use client";

import { motion, useAnimation, type Variants } from "motion/react";
import type { HTMLAttributes, ReactNode } from "react";
import { forwardRef, useImperativeHandle } from "react";

import { cn } from "@/lib/utils";

// Small lucide glyphs with the same handle as the lucide-animated icons, so
// TriggerIcon can play them when the surrounding button is hovered or focused.
// Each icon moves once, briefly, and returns to rest: a hint, never a show.

export interface NeskaIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

type IconProps = HTMLAttributes<HTMLDivElement> & { size?: number };

function animatedIcon(name: string, svg: Variants | undefined, body: (controls: ReturnType<typeof useAnimation>) => ReactNode) {
  const Icon = forwardRef<NeskaIconHandle, IconProps>(({ className, size = 16, ...props }, ref) => {
    const controls = useAnimation();
    useImperativeHandle(ref, () => ({
      startAnimation: () => void controls.start("animate"),
      stopAnimation: () => void controls.start("normal"),
    }));
    return (
      <div className={cn(className)} {...props}>
        <motion.svg
          animate={controls}
          initial="normal"
          variants={svg}
          fill="none"
          width={size}
          height={size}
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          xmlns="http://www.w3.org/2000/svg"
        >
          {body(controls)}
        </motion.svg>
      </div>
    );
  });
  Icon.displayName = name;
  return Icon;
}

const nudge = (axis: "x" | "y", distance: number): Variants => axis === "x"
  ? { normal: { x: 0, transition: { duration: 0.2 } }, animate: { x: [0, distance, 0], transition: { duration: 0.45, ease: "easeInOut" } } }
  : { normal: { y: 0, transition: { duration: 0.2 } }, animate: { y: [0, distance, 0], transition: { duration: 0.45, ease: "easeInOut" } } };

/** Send: the arrow steps forward and comes back. */
export const SendArrowIcon = animatedIcon("SendArrowIcon", nudge("x", 3), () => <>
  <path d="M5 12h14" />
  <path d="m12 5 7 7-7 7" />
</>);

/** Stop: the square settles in, like a key being pressed. */
export const StopSquareIcon = animatedIcon("StopSquareIcon", {
  normal: { scale: 1, transition: { duration: 0.2 } },
  animate: { scale: [1, 0.78, 1], transition: { duration: 0.4, ease: "easeInOut" } },
}, () => <rect x="6" y="6" width="12" height="12" rx="1.5" />);

/** Project: the folder lifts slightly. */
export const FolderIcon = animatedIcon("FolderIcon", {
  normal: { y: 0, rotate: 0, transition: { duration: 0.2 } },
  animate: { y: [0, -1.5, 0], rotate: [0, -4, 0], transition: { duration: 0.45, ease: "easeInOut" } },
}, () => <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9l-.8-1.2A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />);

/** Open a list: the caret drops once. */
export const ChevronDownIcon = animatedIcon("ChevronDownIcon", nudge("y", 2), () => <path d="m6 9 6 6 6-6" />);

/** Go somewhere: arrow right, used for suggestions and "open" links. */
export const ArrowRightIcon = SendArrowIcon;

/** Approve: the tick redraws itself. */
export const CheckIcon = animatedIcon("CheckIcon", undefined, () => <motion.path
  d="M20 6 9 17l-5-5"
  variants={{ normal: { pathLength: 1, opacity: 1 }, animate: { pathLength: [0, 1], opacity: [0, 1], transition: { duration: 0.4, ease: "easeOut" } } }}
/>);

/** Refuse or remove: the cross turns a quarter. */
export const CrossIcon = animatedIcon("CrossIcon", {
  normal: { rotate: 0, transition: { duration: 0.2 } },
  animate: { rotate: 90, transition: { type: "spring", stiffness: 260, damping: 18 } },
}, () => <>
  <path d="M18 6 6 18" />
  <path d="m6 6 12 12" />
</>);

/** Read first: the eye blinks. */
export const EyeIcon = animatedIcon("EyeIcon", {
  normal: { scaleY: 1, transition: { duration: 0.15 } },
  animate: { scaleY: [1, 0.1, 1], transition: { duration: 0.35, ease: "easeInOut" } },
}, () => <>
  <path d="M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" />
  <circle cx="12" cy="12" r="3" />
</>);

/** Home: the roof settles. */
export const HomeIcon = animatedIcon("HomeIcon", nudge("y", -1.5), () => <>
  <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
  <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
</>);

/** Files: the page lifts. */
export const FileTextIcon = animatedIcon("FileTextIcon", nudge("y", -1.5), () => <>
  <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
  <path d="M14 2v4a2 2 0 0 0 2 2h4" />
  <path d="M10 13H8" />
  <path d="M16 17H8" />
</>);

/** Automations: the clock gives a short tick. */
export const ClockIcon = animatedIcon("ClockIcon", {
  normal: { rotate: 0, transition: { duration: 0.2 } },
  animate: { rotate: [0, -12, 8, 0], transition: { duration: 0.5, ease: "easeInOut" } },
}, () => <>
  <circle cx="12" cy="12" r="10" />
  <path d="M12 6v6l4 2" />
</>);
