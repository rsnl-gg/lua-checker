import { Info, Maximize, X, Minus, Minimize } from 'lucide-react';
import { useWindow } from '../../hooks';

interface TitleBarProps {
  title?: string;
  onInfoClick?: () => void;
}

export function TitleBar({ title, onInfoClick }: TitleBarProps) {
  const { minimize, maximize, close, isMaximized, maximizable } = useWindow();

  return (
    <div className="flex items-center justify-between h-10 select-none drag">
      <div className="flex items-center gap-2.5 px-3 h-full pointer-events-none">
        <img
          src="./hd2_arsenal_logo.png"
          alt=""
          className="relative z-80 h-5 w-5 mix-blend-screen"
          draggable={false}
        />
        <span className="relative z-80 text-base font-medium">{title}</span>
      </div>

      <div className="flex items-center h-full no-drag">
        <button
          onClick={onInfoClick}
          className="flex items-center justify-center w-12 h-full text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200 transition-colors outline-none"
          title="System info"
        >
          <Info className="size-5" />
        </button>
        <div className="relative z-80 flex h-full pointer-events-auto">
          <button
            onClick={minimize}
            className="flex items-center justify-center w-12 h-full text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200 transition-colors outline-none"
            title="Minimize"
          >
            <Minus className="size-5" />
          </button>
          {maximizable && (
            <button
              onClick={maximize}
              className="flex items-center justify-center w-12 h-full text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200 transition-colors outline-none"
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              {isMaximized ? (
              <Minimize className="size-5" />
            ) : (
              <Maximize className="size-4" />
              )}
            </button>
          )}
          <button
            onClick={close}
            className="flex items-center justify-center w-12 h-full text-zinc-400 hover:bg-red-900 hover:text-white transition-colors outline-none"
            title="Close"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
