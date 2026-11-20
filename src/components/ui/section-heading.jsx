export default function SectionHeading({
  eyebrow,
  title,
  description,
  id,
  action,
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:mb-10 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-teal-strong uppercase dark:text-teal">
            {eyebrow}
          </p>
        ) : null}
        <h2 id={id} className="text-3xl leading-tight font-bold sm:text-4xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 text-base leading-7 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
