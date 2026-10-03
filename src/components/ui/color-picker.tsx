import * as React from "react"
import { ARSENAL_PATH_COLOR, normalizeHexColor } from "../../../shared/types/scanner"
import { cn } from "@/lib/utils"

interface ColorPickerProps {
  value: string;
  disabled?: boolean;
  onChange: (color: string) => void;
}

function ColorPicker({ value, disabled, onChange }: ColorPickerProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const openRef = React.useRef(false)
  const closedAtRef = React.useRef(0)
  const color = normalizeHexColor(value) ?? ARSENAL_PATH_COLOR

  const close = () => {
    openRef.current = false
    closedAtRef.current = Date.now()
    inputRef.current?.blur()
  }

  const toggle = () => {
    const input = inputRef.current
    if (!input || disabled) {
      return
    }

    if (openRef.current) {
      close()
      return
    }

    if (Date.now() - closedAtRef.current < 300) {
      return
    }

    input.showPicker()
    openRef.current = true
  }

  return (
    <button
      type="button"
      title="Path color"
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={toggle}
      className={cn(
        "relative size-5 shrink-0 cursor-pointer self-center overflow-hidden rounded-full",
        disabled && "pointer-events-none opacity-50"
      )}
      style={{ backgroundColor: color }}
    >
      <input
        ref={inputRef}
        type="color"
        tabIndex={-1}
        value={color}
        disabled={disabled}
        aria-hidden
        onChange={(event) => {
          const next = normalizeHexColor(event.target.value)
          if (next && next !== color) {
            onChange(next)
          }
        }}
        onBlur={() => {
          openRef.current = false
          closedAtRef.current = Date.now()
        }}
        className="pointer-events-none absolute size-0 opacity-0"
        style={{ colorScheme: "dark" }}
      />
    </button>
  )
}

export { ColorPicker }
