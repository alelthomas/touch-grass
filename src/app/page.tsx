import GrassDetector from './components/GrassDetector';

export default function Home() {
  return (
    <main className="min-h-screen">
      <div className="fixed top-0 left-0 right-0 z-10 bg-white/80 backdrop-blur-sm p-4">
        <h1 className="text-2xl font-bold text-center text-green-600">
          TOUCH GRASS
        </h1>
      </div>
      <GrassDetector />
    </main>
  );
}
