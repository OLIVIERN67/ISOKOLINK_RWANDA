import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Send } from "lucide-react";
import { getApiError, messagingApi } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import { Field } from "./ui/Field";

export function ContactSellerModal({
  sellerId,
  sellerName,
  productId,
  productName,
  label = "Message seller",
  className,
  variant = "primary",
}: {
  sellerId: number;
  sellerName: string;
  productId?: number;
  productName?: string;
  label?: string;
  className?: string;
  variant?: "primary" | "outline" | "gold";
}) {
  const { user } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(
    productName
      ? `Hello ${sellerName}, I am interested in "${productName}". Is it still available?`
      : `Hello ${sellerName}, I would like to ask about your products.`,
  );
  const [busy, setBusy] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  function handleOpen() {
    if (!user) {
      navigate("/login", { state: { from: location.pathname + location.search } });
      return;
    }
    setOpen(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!message.trim()) {
      setFieldError("Write a message before sending.");
      return;
    }
    setBusy(true);
    setFieldError(null);
    try {
      const conversation = await messagingApi.start({
        recipientId: sellerId,
        productId,
        subject: productName ? `About ${productName}` : undefined,
        message: message.trim(),
      });
      success("Message sent.", "Conversation started");
      setOpen(false);
      navigate(`/dashboard/conversations/${conversation.id}`);
    } catch (requestError) {
      const parsed = getApiError(requestError);
      setFieldError(parsed.message);
      error(parsed.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button type="button" variant={variant} className={className} onClick={handleOpen}>
        <Send className="h-4 w-4" aria-hidden />
        {label}
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Message ${sellerName}`}
        description={productName ? `About: ${productName}` : "Ask about products, availability, or pickup."}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Your message" htmlFor="contact-message" error={fieldError ?? undefined} required>
            <textarea
              id="contact-message"
              className="textarea"
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);
                setFieldError(null);
              }}
              maxLength={5000}
              rows={5}
              required
            />
          </Field>
          <p className="text-xs text-charcoal/50">
            Keep personal information safe. Do not send mobile money payments before confirming the product in person.
          </p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={busy}>
              {busy ? "Sending…" : "Send message"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
