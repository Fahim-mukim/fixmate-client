export const SERVICE_CATEGORIES = [
  "Smartphone",
  "Laptop & PC",
  "AC",
  "Refrigerator",
  "TV",
  "Washing Machine",
  "Electrical",
];

export const SERVICE_MODES = ["Home Visit", "Shop Drop-off"];

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 12;
export const MAX_LIMIT = 50;
export const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

function cleanString(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function parsePositiveInteger(value, minimum, maximum) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    return null;
  }
  return parsed;
}

function parsePrice(value) {
  if (typeof value !== "string" || value.trim() === "") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function parseListingParams(raw = {}) {
  const params = {
    page: DEFAULT_PAGE,
    limit: DEFAULT_LIMIT,
    sort: "newest",
  };
  const ignored = [];

  const search = cleanString(raw.search, 100);
  if (search) params.search = search;

  const category = cleanString(raw.category, 60);
  if (category) {
    if (SERVICE_CATEGORIES.includes(category)) {
      params.category = category;
    } else {
      ignored.push("category");
    }
  }

  const serviceMode = cleanString(raw.serviceMode, 40);
  if (serviceMode) {
    if (SERVICE_MODES.includes(serviceMode)) {
      params.serviceMode = serviceMode;
    } else {
      ignored.push("service mode");
    }
  }

  const minPrice = parsePrice(raw.minPrice);
  if (raw.minPrice !== undefined && minPrice === null) {
    ignored.push("minimum price");
  }

  const maxPrice = parsePrice(raw.maxPrice);
  if (raw.maxPrice !== undefined && maxPrice === null) {
    ignored.push("maximum price");
  }

  if (minPrice !== null) params.minPrice = minPrice;
  if (maxPrice !== null) params.maxPrice = maxPrice;

  if (
    minPrice !== null &&
    maxPrice !== null &&
    minPrice > maxPrice
  ) {
    delete params.minPrice;
    delete params.maxPrice;
    ignored.push("price range (minimum exceeded maximum)");
  }

  const sort = cleanString(raw.sort, 20);
  if (sort) {
    if (SORT_OPTIONS.some((option) => option.value === sort)) {
      params.sort = sort;
    } else {
      ignored.push("sort");
    }
  }

  if (raw.page !== undefined) {
    const page = parsePositiveInteger(raw.page, 1, 100000);
    if (page === null) ignored.push("page");
    else params.page = page;
  }

  if (raw.limit !== undefined) {
    const limit = parsePositiveInteger(raw.limit, 1, MAX_LIMIT);
    if (limit === null) ignored.push("results per page");
    else params.limit = limit;
  }

  return { params, ignored };
}

export function buildServicesHref(params = {}) {
  const query = new URLSearchParams();

  if (params.search) query.set("search", params.search);
  if (params.category) query.set("category", params.category);
  if (params.serviceMode) query.set("serviceMode", params.serviceMode);
  if (params.minPrice !== undefined) query.set("minPrice", String(params.minPrice));
  if (params.maxPrice !== undefined) query.set("maxPrice", String(params.maxPrice));
  if (params.sort && params.sort !== "newest") query.set("sort", params.sort);
  if (params.page && params.page !== DEFAULT_PAGE) {
    query.set("page", String(params.page));
  }
  if (params.limit && params.limit !== DEFAULT_LIMIT) {
    query.set("limit", String(params.limit));
  }

  const serialized = query.toString();
  return serialized ? `/services?${serialized}` : "/services";
}

export function buildPageHref(params, page) {
  return buildServicesHref({ ...params, page });
}

export function formatPrice(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return "Price not provided";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function isValidServiceId(value) {
  return typeof value === "string" && OBJECT_ID_PATTERN.test(value);
}

export function firstParamValue(value) {
  return Array.isArray(value) ? value[0] : value;
}
