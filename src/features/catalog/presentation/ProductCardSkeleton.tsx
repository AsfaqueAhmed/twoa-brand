// Placeholder matching ProductCard's layout (image aspect ratio, text block
// heights, price/button row) so the grid doesn't jump when real cards swap in.
export default function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-none border border-[#EEEEEE] bg-white">
      <div className="aspect-[4/5] bg-[#EEEEEE] shimmer" />

      <div className="flex flex-1 flex-col p-3 sm:p-5">
        <div className="mt-2 h-4 w-3/4 bg-[#EEEEEE] shimmer" />
        <div className="mt-2.5 h-3 w-full bg-[#EEEEEE] shimmer" />
        <div className="mt-1.5 h-3 w-2/3 bg-[#EEEEEE] shimmer" />

        <div className="mt-auto pt-4 flex items-center justify-between border-t border-[#EEEEEE]">
          <div className="space-y-1.5">
            <div className="h-2.5 w-10 bg-[#EEEEEE] shimmer" />
            <div className="h-4 w-16 bg-[#EEEEEE] shimmer" />
          </div>
          <div className="h-9 w-20 bg-[#EEEEEE] shimmer" />
        </div>
      </div>
    </div>
  );
}
