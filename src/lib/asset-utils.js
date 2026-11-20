export function assetUrl(value) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && typeof value.src === "string") {
    return value.src;
  }
  return "";
}
