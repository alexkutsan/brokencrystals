import type { FC } from 'react';
import { createElement, useEffect, useRef } from 'react';

interface InnerHtmlProps {
  html: string;
  tagName?: string;
  allowRerender?: boolean;
}

export const InnerHtml: FC<InnerHtmlProps> = ({
  html,
  tagName,
  allowRerender,
  ...rest
}) => {
  const elementRef = useRef<HTMLElement | null>(null);
  const isFirstRender = useRef<boolean>(true);

  useEffect(() => {
    if (!html || !elementRef.current) {
      throw new Error("InnerHtml `html` prop can't be null");
    }
    if (!isFirstRender.current) {
      return;
    }
    isFirstRender.current = Boolean(allowRerender);

    // Render as text to prevent DOM XSS from untrusted HTML content.
    elementRef.current.textContent = html;
  }, [html, elementRef]);

  return createElement(tagName ?? 'div', { ...rest, ref: elementRef });
};
