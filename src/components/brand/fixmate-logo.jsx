import Image from "next/image";

import logoForLight from "../../../asset/assets/logos/png/fixmate-logo-white-bg-2048.png";
import logoForDark from "../../../asset/assets/logos/png/fixmate-logo-transparent-2048.png";

export default function FixMateLogo({ className = "", priority = false }) {
  return (
    <span
      role="img"
      aria-label="FixMate"
      className={`relative block w-full max-w-34 ${className}`}
    >
      <Image
        src={logoForLight}
        alt=""
        width={2048}
        height={1849}
        priority={priority}
        className="block h-auto w-full dark:hidden"
      />
      <Image
        src={logoForDark}
        alt=""
        width={2048}
        height={1849}
        priority={priority}
        className="hidden h-auto w-full dark:block"
      />
    </span>
  );
}
