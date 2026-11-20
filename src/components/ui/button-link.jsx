import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

export default function ButtonLink({
  href,
  variant = "default",
  size = "default",
  className = "",
  children,
  ...props
}) {
  return (
    <Link
      href={href}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {children}
    </Link>
  );
}
