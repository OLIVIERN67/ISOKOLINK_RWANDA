import type { AnchorHTMLAttributes, ReactNode } from "react";

export function WhatsAppIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
      <path fill="white" d="M16 2.2C8.4 2.2 2.2 8.4 2.2 16c0 2.4.62 4.65 1.72 6.6L2 30l7.58-1.85A13.7 13.7 0 0 0 16 29.8c7.6 0 13.8-6.2 13.8-13.8S23.6 2.2 16 2.2Zm0 25.1c-2.08 0-4.02-.57-5.68-1.57l-.4-.24-4.5 1.1 1.2-4.38-.26-.42A11.2 11.2 0 0 1 4.7 16C4.7 9.78 9.78 4.7 16 4.7S27.3 9.78 27.3 16 22.22 27.3 16 27.3Z" />
      <path fill="#25D366" d="M22.45 19.45c-.35-.17-2.05-1.01-2.37-1.13-.32-.12-.55-.17-.78.18-.23.34-.9 1.12-1.1 1.35-.2.23-.4.26-.75.09-.35-.17-1.48-.55-2.82-1.75-1.04-.93-1.75-2.08-1.95-2.43-.2-.35-.02-.54.15-.71.16-.15.35-.4.52-.6.17-.2.23-.35.35-.58.12-.23.06-.43-.03-.6-.09-.17-.78-1.88-1.07-2.58-.28-.67-.57-.58-.78-.59h-.67c-.23 0-.6.09-.92.43-.32.35-1.21 1.19-1.21 2.9 0 1.71 1.24 3.36 1.41 3.59.17.23 2.44 3.73 5.91 5.23.83.36 1.47.58 1.97.74.83.26 1.59.22 2.18.13.67-.1 2.07-.84 2.36-1.65.29-.81.29-1.5.2-1.65-.09-.14-.32-.23-.67-.4Z" />
    </svg>
  );
}

export function WhatsAppContactButton({
  href,
  className,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children?: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`whatsapp-btn ${className ?? ""}`.trim()}
      {...props}
    >
      <WhatsAppIcon />
      <span>{children ?? "WhatsApp"}</span>
    </a>
  );
}
