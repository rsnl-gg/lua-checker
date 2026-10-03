import { useEffect, useState } from 'react';
import { FaLinux, FaWindows } from 'react-icons/fa';
import { BiLogoSteam } from 'react-icons/bi';
import type { AppPlatform, ISystemInfo } from '../../../shared/types/scanner';
import arsenalBg from '../../assets/arsenal-bg.webp';
import arsenalMascot from '../../assets/arsenal-mascot.png';
import { scannerService } from '../../services/ipc';
import { Button } from '../ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerBackdrop,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '../ui/drawer';

interface SystemInfoDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SystemInfoDrawer({ open, onOpenChange }: SystemInfoDrawerProps) {
  const [info, setInfo] = useState<ISystemInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    void scannerService.getSystemInfo().then((response) => {
      if (cancelled) {
        return;
      }
      if (!response.success || !response.data) {
        setInfo(null);
        setError(response.error ?? 'Unable to read system info');
        return;
      }
      setError(null);
      setInfo(response.data);
    });

    return () => {
      cancelled = true;
    };
  }, [open]);

  return (
    <Drawer direction="bottom" open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerContent className="overflow-visible">
        <DrawerBackdrop src={arsenalBg} />
        {open && info && !info.arsenalInstalled && <MissingArsenalArt />}
        <DrawerHeader className="relative z-10">
          <DrawerTitle>System</DrawerTitle>
          <DrawerDescription>This computer</DrawerDescription>
        </DrawerHeader>

        <div className="relative z-10 flex flex-col gap-4 px-4 pt-2 pb-6">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {info && (
            <>
              <div className="flex items-center gap-2">
                <OsIcon platform={info.platform} />
                <p className="min-w-0 flex-1 truncate text-base" title={osLabel(info)}>{osLabel(info)}</p>
              </div>
              <InfoRow label="Architecture" value={info.arch} />
              <InfoRow label="ARSENAL - Lua Checker" value={info.appVersion} />
              {info.arsenalVersion && <InfoRow label="ARSENAL - Companion Desktop App" value={info.arsenalVersion} />}
              {!info.arsenalInstalled && (
                <Button
                  type="button"
                  className="h-10 w-full bg-[#FEE800]/90 text-[#141414] hover:bg-[#FEE800] font-bold"
                  onClick={() => {
                    void scannerService.openArsenalDownload().then((response) => {
                      if (!response.success) {
                        setError(response.error ?? 'Unable to open the download page');
                      }
                    });
                  }}
                >
                  DOWNLOAD HD2 ARSENAL
                </Button>
              )}
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

function MissingArsenalArt() {
  return (
    <div className="pointer-events-none absolute -top-12 right-0 z-0 h-160 overflow-hidden">
      <img
        src={arsenalMascot}
        alt=""
        draggable={false}
        className="arsenal-mascot-rise block h-full w-auto max-w-none object-top"
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="truncate text-base" title={value}>{value}</p>
    </div>
  );
}

function osLabel(info: ISystemInfo): string {
  if (info.platform === 'Steamdeck') {
    return 'SteamOS';
  }
  return info.osVersion;
}

function OsIcon({ platform }: { platform: AppPlatform }) {
  if (platform === 'Windows') {
    return <FaWindows className="size-5 text-[#00A4EF]" aria-hidden />;
  }
  if (platform === 'Steamdeck') {
    return <BiLogoSteam className="size-5 text-[#21a2ff]" aria-hidden />;
  }
  return <FaLinux className="size-5 text-[#ff8c00]" aria-hidden />;
}

