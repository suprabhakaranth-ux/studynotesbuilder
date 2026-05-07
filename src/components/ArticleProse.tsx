import { useMemo } from "react";
import { sanitizePublicHtml } from "@/utils/sanitizePublicHtml";

interface ArticleProseProps {
  html: string;
  className?: string;
}

export const ArticleProse = ({ html, className = "" }: ArticleProseProps) => {
  const clean = useMemo(() => sanitizePublicHtml(html), [html]);
  return (
    <div
      className={`article-prose ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
};
