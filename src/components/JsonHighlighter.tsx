import React, { useMemo } from "react";

/* ============================================================================
 * [SECTION 7: RESULT SCREEN — Raw proof collapsible code block]
 * - Background #F1EDE4, padding 16px, 6px radius, 1px border #E5E1D8,
 *   mono 12.5px, max-height 400px with scroll.
 * - Subtle fade-out (linear-gradient from transparent to #F1EDE4) at the
 *   bottom 24px — the ONE allowed gradient in the entire app.
 * ============================================================================ */

interface JsonHighlighterProps {
  data: unknown;
}

interface Token {
  type: "key" | "string" | "number" | "boolean" | "null" | "plain";
  value: string;
}

function tokenizeJson(jsonStr: string): Token[] {
  const tokens: Token[] = [];
  const regex =
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(jsonStr)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        type: "plain",
        value: jsonStr.slice(lastIndex, match.index)
      });
    }

    const fullMatch = match[0];
    if (fullMatch.startsWith('"')) {
      if (fullMatch.endsWith(":")) {
        const colonIdx = fullMatch.lastIndexOf(":");
        tokens.push({
          type: "key",
          value: fullMatch.slice(0, colonIdx)
        });
        tokens.push({
          type: "plain",
          value: fullMatch.slice(colonIdx)
        });
      } else {
        tokens.push({
          type: "string",
          value: fullMatch
        });
      }
    } else if (fullMatch === "true" || fullMatch === "false") {
      tokens.push({
        type: "boolean",
        value: fullMatch
      });
    } else if (fullMatch === "null") {
      tokens.push({
        type: "null",
        value: fullMatch
      });
    } else {
      tokens.push({
        type: "number",
        value: fullMatch
      });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < jsonStr.length) {
    tokens.push({
      type: "plain",
      value: jsonStr.slice(lastIndex)
    });
  }

  return tokens;
}

export const JsonHighlighter: React.FC<JsonHighlighterProps> = ({ data }) => {
  const formatted = useMemo(() => JSON.stringify(data, null, 2), [data]);
  const tokens = useMemo(() => tokenizeJson(formatted), [formatted]);

  return (
    <div className="relative rounded-[6px] border border-[#E5E1D8] bg-[#F1EDE4] overflow-hidden">
      <pre className="font-mono text-[12.5px] tracking-[0.005em] leading-[1.55] max-h-[400px] overflow-auto p-[16px] pb-[32px] text-[#1A1815] m-0">
        <code>
          {tokens.map((token, idx) => {
            switch (token.type) {
              case "key":
                return (
                  <span key={idx} className="text-[#1A1815] font-medium">
                    {token.value}
                  </span>
                );
              case "string":
                return (
                  <span key={idx} className="text-[#2D5A3D]">
                    {token.value}
                  </span>
                );
              case "number":
              case "boolean":
                return (
                  <span key={idx} className="text-[#8A6A2F]">
                    {token.value}
                  </span>
                );
              case "null":
              case "plain":
              default:
                return (
                  <span key={idx} className="text-[#5A5449]">
                    {token.value}
                  </span>
                );
            }
          })}
        </code>
      </pre>
      {/* [SECTION 7: Subtle bottom 24px fade-out — linear-gradient from transparent to #F1EDE4] */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-0 right-0 bottom-0 h-[24px]"
        style={{
          background: "linear-gradient(to bottom, transparent, #F1EDE4)"
        }}
      />
    </div>
  );
};
