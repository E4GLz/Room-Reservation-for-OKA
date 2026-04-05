export default function Loading() {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="rounded-[24px] border border-slate-200 bg-white px-8 py-6 text-center shadow-sm">
        <p className="text-sm uppercase tracking-[0.2em] text-brand-700">Loading</p>
        <h2 className="mt-3 text-xl font-semibold text-slate-950">Preparing reservation workspace</h2>
        <p className="mt-2 text-sm text-slate-500">Fetching rooms, bookings, and dashboard summaries.</p>
      </div>
    </div>
  );
}
