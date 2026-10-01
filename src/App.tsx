import { TitleBar } from './components';
import { useWindow } from './hooks';

function App() {
  const { appVersion } = useWindow();
  return (
    <div className="flex flex-col h-screen">
      <TitleBar title='ARSENAL DESKTOP APPLICATION'/>
      
      <main className="flex-1 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-8 max-w-lg text-center">
          <img 
            src="./rsnl_logo_horizontal.svg" 
            alt="Arsenal Logo" 
            className="w-auto opacity-90"
            draggable={false}
          />
          
          <div className="space-y-3">
            <h1 className="text-2xl font-semibold tracking-tight bg-arsenal text-black px-4 py-2 rounded-md">
            ARSENAL DESKTOP APPLICATION
            </h1>
            <p className="text-sm leading-relaxed">
              A production-ready boilerplate for building desktop applications with 
              Electron, React, TypeScript, and SQLite.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 text-xs">
            <span className="px-2.5 py-1 bg-zinc-800/50 rounded-md border border-zinc-700/50">
              Electron
            </span>
            <span className="px-2.5 py-1 bg-zinc-800/50 rounded-md border border-zinc-700/50">
              React
            </span>
            <span className="px-2.5 py-1 bg-zinc-800/50 rounded-md border border-zinc-700/50">
              TypeScript
            </span>
            <span className="px-2.5 py-1 bg-zinc-800/50 rounded-md border border-zinc-700/50">
              SQLite
            </span>
            <span className="px-2.5 py-1 bg-zinc-800/50 rounded-md border border-zinc-700/50">
              Tailwind CSS
            </span>
            <span className="px-2.5 py-1 bg-zinc-800/50 rounded-md border border-zinc-700/50">
              shadcn/ui
            </span>
          </div>
          <p className="text-sm font-light text-zinc-400 pb-1 border-b-2 border-arsenal">
            {appVersion}
          </p>
        </div>
      </main>
    </div>
  );
}

export default App;
