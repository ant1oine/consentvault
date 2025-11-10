export default function Spinner() {
  return (
    <div className="h-screen flex items-center justify-center text-gray-600">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm">Loading...</p>
      </div>
    </div>
  );
}

