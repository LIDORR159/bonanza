import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

/**
 * Renders page text written as Markdown in the admin.
 *
 * Raw HTML in the source is not rendered, so nothing typed into a page can
 * inject markup or scripts. Links to other sites open in a new tab.
 */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-site">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          // The page already has its <h1>.
          h1: ({ children: content }) => <h2>{content}</h2>,
          a: ({ href, children: content }) => {
            const external = /^https?:\/\//.test(href ?? "")
            return (
              <a
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              >
                {content}
              </a>
            )
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
