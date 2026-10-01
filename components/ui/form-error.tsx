/** Renders nothing until there is a message, so callers can pass state directly. */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
    >
      {message}
    </p>
  );
}
