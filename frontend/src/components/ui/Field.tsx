import { Children, cloneElement, forwardRef, isValidElement, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "../../utils/cn";

interface FieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, error, hint, required, children, className }: FieldProps) {
  const messageId = htmlFor ? `${htmlFor}-${error ? "error" : "hint"}` : undefined;
  const describedChildren = Children.map(children, (child) => {
    if (!messageId || !isValidElement(child)) return child;
    const element = child as React.ReactElement<{ "aria-describedby"?: string; "aria-invalid"?: boolean }>;
    const describedBy = [element.props["aria-describedby"], messageId].filter(Boolean).join(" ");
    return cloneElement(element, {
      "aria-describedby": describedBy,
      ...(error ? { "aria-invalid": true } : {}),
    });
  });
  return (
    <div className={cn("w-full", className)}>
      <label className="label" htmlFor={htmlFor}>
        {label}
        {required ? <span className="ml-0.5 text-error">*</span> : null}
      </label>
      {describedChildren}
      {error ? (
        <p id={messageId} className="field-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="mt-1.5 text-xs text-gray-600">{hint}</p>
      ) : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn("input", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <select ref={ref} className={cn("select", className)} {...props}>
      {children}
    </select>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...props },
  ref,
) {
  return <textarea ref={ref} className={cn("textarea", className)} {...props} />;
});
