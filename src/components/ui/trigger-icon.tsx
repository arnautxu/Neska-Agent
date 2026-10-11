"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useRef, type ForwardRefExoticComponent, type HTMLAttributes, type RefAttributes } from "react";

import { cn } from "@/lib/utils";

type AnimatedIconHandle = { startAnimation: () => void; stopAnimation: () => void };
type AnimatedIcon = ForwardRefExoticComponent<HTMLAttributes<HTMLDivElement> & { size?: number } & RefAttributes<AnimatedIconHandle>>;

// lucide-animated icons only animate when the glyph itself is hovered. This plays
// them when the button or link that contains them is hovered or focused, and
// keeps them still for people who prefer reduced motion.
export function TriggerIcon({ icon: Icon, size = 16, className }: { icon: AnimatedIcon; size?: number; className?: string }) {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const iconRef = useRef<AnimatedIconHandle>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const trigger = wrapperRef.current?.closest<HTMLElement>("button, a, [role='menuitem'], [role='tab']");
    if (!trigger || reduceMotion) return;
    const start = () => iconRef.current?.startAnimation();
    const stop = () => iconRef.current?.stopAnimation();
    trigger.addEventListener("pointerenter", start);
    trigger.addEventListener("pointerleave", stop);
    trigger.addEventListener("focus", start);
    trigger.addEventListener("blur", stop);
    return () => {
      trigger.removeEventListener("pointerenter", start);
      trigger.removeEventListener("pointerleave", stop);
      trigger.removeEventListener("focus", start);
      trigger.removeEventListener("blur", stop);
    };
  }, [reduceMotion]);

  return (
    <span ref={wrapperRef} aria-hidden="true" className={cn("inline-grid shrink-0 place-items-center", className)}>
      <Icon ref={iconRef} size={size} className="grid place-items-center" />
    </span>
  );
}
