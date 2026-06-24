import { Skeleton } from "@/components/Skeleton";

/** Skeleton mientras carga la tienda (mejora la sensación de velocidad). */
export default function StoreLoading() {
  return (
    <div className="flex-1 bg-gray-50">
      <div className="bg-slate-200/80 px-4 pb-12 pt-7 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-[1440px] items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-3xl bg-slate-300/70" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-28 bg-slate-300/70" />
            <Skeleton className="h-8 w-64 bg-slate-300/70" />
            <Skeleton className="h-4 w-48 bg-slate-300/70" />
          </div>
        </div>
      </div>
      <div className="mx-auto -mt-6 max-w-[1440px] rounded-t-[2rem] bg-gray-50 px-4 pb-32 pt-6 sm:px-6 lg:px-8">
        <Skeleton className="mb-5 h-11 w-full max-w-md" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-2xl bg-white p-3 ring-1 ring-slate-200/70">
              <Skeleton className="mb-3 aspect-square w-full" />
              <Skeleton className="mb-2 h-4 w-3/4" />
              <Skeleton className="mb-3 h-5 w-1/2" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
