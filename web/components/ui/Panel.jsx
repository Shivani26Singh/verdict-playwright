export default function Panel({ title, subtitle, accent = "observed", children, id }) {
  const tone =
    accent === "assessment"
      ? "border-assessment-border bg-assessment-bg"
      : "border-observed-border bg-observed-bg";
  const heading =
    accent === "assessment" ? "text-assessment" : "text-observed";

  return (
    <section id={id} className={`rounded-2xl border ${tone} p-5 shadow-sm`}>
      <h2 className={`text-lg font-semibold ${heading}`}>{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}
