/**
 * components/auth/auth-frame.tsx
 *
 * The space the sign-in and sign-up forms sit in. Clerk draws its form in the
 * browser, after the page arrives, so without this the page is first nearly
 * empty, the footer rides up into the middle, and then everything is pushed
 * down as the form appears. Two things stop that:
 *
 * - Every page keeps its footer at the bottom of the screen (app/(site)/
 *   layout.tsx), so it doesn't ride up on a nearly empty page.
 * - Until Clerk's form is ready, a still picture of it holds its place
 *   (`AuthSkeleton`, passed to Clerk as its `fallback`), the same size and in
 *   the same style, so the form seems to fill in rather than appear.
 */

export function AuthFrame({ children }: { children: React.ReactNode }) {
  return <main className="wrap auth-frame">{children}</main>;
}

/** A quiet stand-in for Clerk's form while it loads: its outline, its title, a button, a field and a button. */
export function AuthSkeleton({ title, fields = 1 }: { title: string; fields?: number }) {
  return (
    <div className="auth-skeleton" aria-busy="true" aria-label="Loading the form">
      <p className="t">{title}</p>
      <span className="bar wide" />
      <span className="btn-shape" />
      <span className="or" />
      {Array.from({ length: fields }, (_, i) => <span key={i} className="field"><span className="bar short" /><span className="box" /></span>)}
      <span className="btn-shape dark" />
      <span className="foot"><span className="bar" /></span>
    </div>
  );
}
