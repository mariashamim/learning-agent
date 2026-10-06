"use client";

import { useRef, type ButtonHTMLAttributes } from "react";
import { useMagneticButton } from "@/hooks/useMagneticButton";
import { useMotionPrefs } from "@/hooks/useMotionPrefs";

/** Primary button: coffee fill, magnetic pull, springy press. */
export function MagneticButton({ className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const ref = useRef<HTMLButtonElement>(null);
  const { richPointer } = useMotionPrefs();
  useMagneticButton(ref, { enabled: richPointer });

  return <button ref={ref} className={`btn-primary magnetic ${className}`} {...props} />;
}
