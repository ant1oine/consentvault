import Link from "next/link";

export default function HomePage() {
  return (
    <main className="h-screen flex flex-col items-center justify-center text-center bg-white">
      <h1 className="text-4xl font-bold mb-4">Welcome to ConsentVault</h1>
      <p className="text-gray-600 mb-8">Data compliance made effortless.</p>
      <Link
        href="/login"
        className="bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700"
      >
        Login
      </Link>
    </main>
  );
}
