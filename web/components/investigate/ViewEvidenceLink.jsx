"use client";

export default function ViewEvidenceLink({ indices }) {
  const list = Array.isArray(indices) ? indices : [];

  function onClick() {
    list.forEach((index) => {
      if (index == null) return;
      const el = document.getElementById(`ev-index-${index}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("highlight-evidence");
      setTimeout(() => el.classList.remove("highlight-evidence"), 1500);
    });
  }

  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1 text-sm font-medium text-sky-600 hover:underline">
      View evidence
      <span aria-hidden="true">›</span>
    </button>
  );
}
