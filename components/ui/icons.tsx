/** The few drawn marks the site uses. All take the current colour. */

export function UpIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2 14.5 13h-13z" /></svg>;
}

export function SayIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 17 15" aria-hidden="true"><path d="M1 1h15v9.500H7L3.500 14v-3.500H1z" /></svg>;
}

export function SearchIcon() {
  return <svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="6.500" cy="6.500" r="5" /><path d="m10.500 10.500 4.500 4.500" /></svg>;
}

/** The mark: a cat in round glasses, one red line (DESIGN.md). It blinks now and then, and when the logo is hovered. */
export function CatMark() {
  return (
    <svg viewBox="0 0 38 32" aria-hidden="true">
      <path d="M5 3l8 6.500c3.500-1 8.500-1 12 0L33 3l-1 15c-.700 7-6.500 11-13 11S6.700 25 6 18z" />
      <circle cx="13.300" cy="17" r="4.300" /><circle cx="24.700" cy="17" r="4.300" />
      {/* Pupils. On the splash they glance toward the chosen side and follow an address being typed (--px, --py). */}
      <circle className="pupil" cx="13.300" cy="17" r="1.250" /><circle className="pupil" cx="24.700" cy="17" r="1.250" />
      <path d="M17.600 17h2.800M9 17H6.300M29 17h2.700M1 21.500l4.300-.800M1.500 25.500l4.300-1.800M37 21.500l-4.300-.800M36.500 25.500l-4.300-1.800" />
      <path className="n" d="M17.700 23h2.600L19 24.700z" />
      {/* Closed eyes, drawn for a moment every few seconds: the cat blinks behind its glasses. */}
      <path className="lid" d="M10.200 17.200q3.100 2.300 6.200 0M21.600 17.200q3.100 2.300 6.200 0" />
    </svg>
  );
}
