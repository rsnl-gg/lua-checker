import { Maximize, X, Minus, Minimize } from 'lucide-react';
import { useWindow } from '../../hooks';

interface TitleBarProps {
  title?: string;
}

export function TitleBar({ title }: TitleBarProps) {
  const { minimize, maximize, close, isMaximized } = useWindow();

  return (
    <div className="flex items-center justify-between h-10 select-none drag">
      <div className="flex items-center gap-3 px-4 no-drag">
        <span className="text-sm font-medium">{title}</span>
      </div>

      <div className="flex items-center h-full no-drag">
        <button
          onClick={minimize}
          className="flex items-center justify-center w-12 h-full text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200 transition-colors outline-none"
          title="Minimize"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={maximize}
          className="flex items-center justify-center w-12 h-full text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200 transition-colors outline-none"
          title={isMaximized ? 'Restore' : 'Maximize'}
        >
          {isMaximized ? (
            <Minimize className="w-4 h-4" />
          ) : (
            <Maximize className="w-3.5 h-3.5" />
          )}
        </button>
        <button
          onClick={close}
          className="flex items-center justify-center w-12 h-full text-zinc-400 hover:bg-red-900 hover:text-white transition-colors outline-none"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
