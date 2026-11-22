import Image from "next/image";

import logoForLight from "../../../asset/assets/logos/png/fixmate-logo-white-bg-2048.png";
import logoForDark from "../../../asset/assets/logos/png/fixmate-logo-transparent-2048.png";

export default function FixMateLogo({ className = "", priority = false }) {
  return (
    <span
      role="img"
      aria-label="FixMate"
      className={`inline-flex items-center gap-2.5 ${className}`}
    >
      <span className="relative block h-9 w-9 shrink-0 sm:h-10 sm:w-10">
        <Image
          src={logoForLight}
          alt=""
          width={2048}
          height={1849}
          priority={priority}
          className="block h-full w-full object-contain dark:hidden"
        />
        <Image
          src={logoForDark}
          alt=""
          width={2048}
          height={1849}
          priority={priority}
          className="hidden h-full w-full object-contain dark:block"
        />
      </span>
      <span className="text-lg font-bold tracking-tight text-navy dark:text-foreground sm:text-xl">
        Fix<span className="text-teal-strong dark:text-teal">Mate</span>
      </span>
    </span>
  );
}
