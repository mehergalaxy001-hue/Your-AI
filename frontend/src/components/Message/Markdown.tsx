import { memo, useRef, type ReactNode } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { useCopy } from "../../hooks/useCopy";
import { CheckIcon, CopyIcon } from "../UI/Icons";

function CodeBlock({ children }: { children?: ReactNode }) {
  const ref = useRef<HTMLPreElement>(null);
  const [copied, copy] = useCopy();
  const className = (children as { props?: { className?: string } } | undefined)?.props?.className ?? "";
  const lang = /language-([\w+#-]+)/.exec(className)?.[1] ?? "text";

  return (
    <div className="code-block">
      <div className="code-head">
        <span>{lang}</span>
        <button type="button" onClick={() => copy(ref.current?.innerText ?? "")} aria-label={copied ? "Code copied" : "Copy code"}>
          {copied ? <CheckIcon width={14} height={14} /> : <CopyIcon width={14} height={14} />}
          {copied ? "Copied" : "Copy code"}
        </button>
      </div>
      <pre ref={ref} tabIndex={0}>{children}</pre>
    </div>
  );
}

const components: Components = {
  pre: ({ children }) => <CodeBlock>{children}</CodeBlock>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow">{children}</a>
  ),
  table: ({ children }) => (
    <div className="table-wrap" tabIndex={0}><table>{children}</table></div>
  ),
};

const remarkPlugins = [remarkGfm];
const rehypePlugins: Parameters<typeof ReactMarkdown>[0]["rehypePlugins"] = [[rehypeHighlight, { detect: true }]];

/**
 * Safe Markdown renderer: raw HTML is never rendered (react-markdown default)
 * and unsafe URL protocols are stripped by its default urlTransform.
 */
function Markdown({ text }: { text: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}

export default memo(Markdown);
