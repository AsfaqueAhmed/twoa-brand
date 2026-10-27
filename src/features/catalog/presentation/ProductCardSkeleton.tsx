// Placeholder matching ProductCard's layout (image aspect ratio, text block
// heights, size chips, price, full-width button) so the grid doesn't jump
// when real cards swap in.
export default function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-none bg-white">
      <div className="aspect-[4/5] bg-[#EEEEEE] shimmer" />

      <div className="flex flex-1 flex-col pt-3 pb-1">
        <div className="h-4 w-3/4 bg-[#EEEEEE] shimmer" />
        <div className="mt-2.5 h-3 w-full bg-[#EEEEEE] shimmer" />
        <div className="mt-1.5 h-3 w-2/3 bg-[#EEEEEE] shimmer" />
        <div className="mt-3 h-3 w-1/3 bg-[#EEEEEE] shimmer" />
        <div className="mt-2.5 flex gap-1.5">
          <div className="h-6 w-8 bg-[#EEEEEE] shimmer" />
          <div className="h-6 w-8 bg-[#EEEEEE] shimmer" />
          <div className="h-6 w-8 bg-[#EEEEEE] shimmer" />
        </div>
        <div className="mt-3 h-5 w-20 bg-[#EEEEEE] shimmer" />
        <div className="mt-3 h-10 w-full bg-[#EEEEEE] shimmer" />
      </div>
    </div>
  );
}
