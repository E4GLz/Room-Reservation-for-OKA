export function StatePanel({
  title,
  message
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-[#c9d9ff] bg-[#f7f9ff] px-6 py-12 text-center">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{message}</p>
    </div>
  );
}
