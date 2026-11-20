export default function ServiceImage({
  src,
  alt,
  className = "",
  priority = false,
}) {
  let imageUrl = "";

  if (typeof src === "string" && src.length > 0) {
    try {
      const parsed = new URL(src);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        imageUrl = parsed.toString();
      }
    } catch (_) {
      imageUrl = "";
    }
  }

  if (!imageUrl) {
    return (
      <div
        role="img"
        aria-label="Service image unavailable"
        className={`flex items-center justify-center bg-mist text-xs font-medium text-muted-foreground dark:bg-surface-alt ${className}`}
      >
        Image unavailable
      </div>
    );
  }

  return (
    // Service images are hosted URLs from the API; the exact host is not configured for next/image remotePatterns.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={`object-cover ${className}`}
    />
  );
}
