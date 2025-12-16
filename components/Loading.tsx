export function Loading() {
  return (
    <div className="flex justify-center py-12">
      <div className="flex items-center gap-3 text-gray-400">
        <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        로딩 중...
      </div>
    </div>
  );
}
