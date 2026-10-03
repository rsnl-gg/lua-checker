import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  status: string;
}

export function LoadingScreen({ status }: LoadingScreenProps) {
  return (
    <div className="relative flex flex-1 items-center justify-center">
      <Loader2 className="size-6 animate-spin text-arsenal" />
      <p className="absolute top-[calc(50%+1.5rem)] right-6 left-6 text-center text-base break-words text-muted-foreground">
        {status}
      </p>
    </div>
  );
}
