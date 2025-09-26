import BuyCornCard from "./components/BuyCornCard";

export default function Home() {
  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Welcome to Bob’s Corn 🌽</h1>
        <p className="text-sm mt-2">Demo per-client 1/min rate limit.</p>
      </div>
      <BuyCornCard />
    </main>
  );
}
