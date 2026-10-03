import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"

import { cn } from "@/lib/utils"

const DrawerDismissContext = React.createContext<(() => void) | null>(null)

function Drawer({
  onOpenChange,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  const onOpenChangeRef = React.useRef(onOpenChange)
  onOpenChangeRef.current = onOpenChange
  const dismiss = React.useCallback(() => {
    onOpenChangeRef.current?.(false)
  }, [])

  return (
    <DrawerDismissContext.Provider value={dismiss}>
      <DrawerPrimitive.Root
        data-slot="drawer"
        onOpenChange={onOpenChange}
        {...props}
        modal={false}
      />
    </DrawerDismissContext.Provider>
  )
}

function DrawerTrigger({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />
}

function DrawerPortal({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />
}

function DrawerClose({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />
}

function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<"button">) {
  const dismiss = React.useContext(DrawerDismissContext)

  return (
    <button
      type="button"
      data-slot="drawer-overlay"
      aria-label="Close"
      tabIndex={-1}
      className={cn(
        "fixed inset-0 z-40 cursor-default border-0 bg-black/50 p-0 backdrop-blur-sm outline-none pointer-events-auto",
        className
      )}
      {...props}
      onPointerDown={(event) => {
        event.stopPropagation()
      }}
      onClick={() => dismiss?.()}
    />
  )
}

function DrawerContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content>) {
  return (
    <DrawerPortal>
      <DrawerOverlay />
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        className={cn(
          "group/drawer-content fixed z-50 flex h-auto flex-col bg-background outline-none focus:outline-none focus-visible:outline-none",
          "data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:max-h-[85vh] data-[vaul-drawer-direction=bottom]:rounded-t-xl",
          className
        )}
        {...props}
      >
        <div className="relative z-10 mx-auto mt-3 hidden h-1.5 w-16 shrink-0 rounded-full bg-zinc-700 group-data-[vaul-drawer-direction=bottom]/drawer-content:block" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  )
}

function DrawerBackdrop({ src }: { src: string }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-[inherit]" aria-hidden>
      <div
        className="absolute -inset-8 bg-cover bg-center bg-no-repeat blur-xs"
        style={{ backgroundImage: `url(${src})` }}
      />
    </div>
  )
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn("flex flex-col gap-1 px-4 pt-4 pb-2", className)}
      {...props}
    />
  )
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function DrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn("text-base font-semibold", className)}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerBackdrop,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
}
