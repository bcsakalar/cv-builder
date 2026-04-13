import type { CSSProperties } from "react";
import { getPreviewContactItems } from "./personal-info";

interface PreviewContactItemsProps {
  personalInfo: Record<string, unknown> | null;
  className: string;
  itemClassName?: string;
  style?: CSSProperties;
}

export function PreviewContactItems({
  personalInfo,
  className,
  itemClassName,
  style,
}: PreviewContactItemsProps) {
  const items = getPreviewContactItems(personalInfo);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className={className} style={style}>
      {items.map((item) => {
        const content = (
          <>
            {item.icon} {item.value}
          </>
        );

        if (!item.href) {
          return (
            <span key={item.key} className={itemClassName}>
              {content}
            </span>
          );
        }

        const isExternal = item.href.startsWith("http://") || item.href.startsWith("https://");

        return (
          <a
            key={item.key}
            href={item.href}
            className={itemClassName}
            {...(isExternal ? { target: "_blank", rel: "noreferrer" } : {})}
          >
            {content}
          </a>
        );
      })}
    </div>
  );
}