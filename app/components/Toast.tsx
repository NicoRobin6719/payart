type ToastProps = {
  type: "error" | "success";
  message: string;
};

export default function Toast({ type, message }: ToastProps) {
  return (
    <div
      role="alert"
      className={`rounded-xl px-4 py-3 text-sm ${
        type === "success"
          ? "bg-green-100 text-green-800"
          : "bg-red-100 text-red-800"
      }`}
    >
      {message}
    </div>
  );
}
