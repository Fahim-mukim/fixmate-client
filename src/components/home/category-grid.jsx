import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { assetUrl } from "@/lib/asset-utils";
import { buildServicesHref, SERVICE_CATEGORIES } from "@/lib/service-utils";
import airConditioner from "../../../asset/assets/icons/air-conditioner.svg";
import electrical from "../../../asset/assets/icons/electrical.svg";
import laptop from "../../../asset/assets/icons/laptop.svg";
import refrigerator from "../../../asset/assets/icons/refrigerator.svg";
import smartphone from "../../../asset/assets/icons/smartphone.svg";
import television from "../../../asset/assets/icons/television.svg";
import washingMachine from "../../../asset/assets/icons/washing-machine.svg";

const categoryIcons = {
  Smartphone: smartphone,
  "Laptop & PC": laptop,
  AC: airConditioner,
  Refrigerator: refrigerator,
  TV: television,
  "Washing Machine": washingMachine,
  Electrical: electrical,
};

export default function CategoryGrid() {
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {SERVICE_CATEGORIES.map((category) => (
        <li key={category}>
          <Link
            href={buildServicesHref({ category })}
            className="flex h-full flex-col justify-between gap-4 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-teal focus-visible:border-teal"
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-mist">
              {/* Approved line icons use a fixed navy stroke and are shown on a light tile in both themes. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={assetUrl(categoryIcons[category])}
                alt=""
                aria-hidden="true"
                width={24}
                height={24}
                className="size-6"
              />
            </div>
            <span className="flex items-start justify-between gap-2 text-sm font-semibold">
              {category}
              <ArrowUpRight aria-hidden="true" className="size-4 shrink-0 text-teal-strong" />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
