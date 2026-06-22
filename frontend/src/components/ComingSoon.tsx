export function ComingSoon({ title, note }: { title: string; note: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">{title}</h1>
      <div className="rounded-2xl bg-white p-10 text-center ring-1 ring-black/5">
        <p className="text-5xl">🚧</p>
        <p className="mt-3 text-gray-500">{note}</p>
      </div>
    </div>
  );
}
