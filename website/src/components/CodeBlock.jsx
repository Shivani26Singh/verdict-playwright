import { useState } from "react";
import { Highlight, themes } from "prism-react-renderer";

const customTheme = {
  ...themes.vsDark,
  plain: { ...themes.vsDark.plain, backgroundColor: "transparent", color: "#d7dadd" },
  styles: [
    ...themes.vsDark.styles,
    { types: ["comment"], style: { color: "#5b6470", fontStyle: "italic" } },
    { types: ["string"], style: { color: "#3ddc84" } },
    { types: ["keyword", "builtin"], style: { color: "#57e79a" } },
    { types: ["function", "attr-name"], style: { color: "#8fd6ff" } },
    { types: ["number", "boolean"], style: { color: "#e0b84f" } },
    { types: ["punctuation"], style: { color: "#7b838c" } },
  ],
};

export default function CodeBlock({ code, language = "bash", title, className = "" }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(code.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard API unavailable (older browser, insecure context) —
      // fail silently rather than throw in front of a visitor.
    }
  };

  return (
    <div
      className={`group relative overflow-hidden rounded-lg border border-term-border bg-term-bg shadow-soft ${className}`}
    >
      <div className="flex items-center justify-between border-b border-term-border bg-term-panel px-4 py-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ef5350]/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#f2b84b]/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#3ddc84]/80" />
          {title ? (
            <span className="ml-3 font-mono text-xs text-term-dim">{title}</span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="rounded border border-term-border px-2 py-1 font-mono text-xs text-term-dim transition hover:border-[#3ddc84]/50 hover:text-[#3ddc84]"
          aria-label="Copy code to clipboard"
        >
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <Highlight theme={customTheme} code={code.trim()} language={language}>
        {({ className: hlClassName, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={`${hlClassName} overflow-x-auto p-4 font-mono text-[13px] leading-relaxed sm:text-sm`}
            style={style}
          >
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
}
