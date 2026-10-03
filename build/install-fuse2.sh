set -u

if [[ -z "${FUSE2_SETUP_TERMINAL:-}" && ! -t 1 ]]; then
  export FUSE2_SETUP_TERMINAL=1
  script="$0"
  if command -v readlink >/dev/null 2>&1; then
    resolved="$(readlink -f "$script" 2>/dev/null || true)"
    if [[ -n "$resolved" ]]; then
      script="$resolved"
    fi
  fi

  child=(env FUSE2_SETUP_TERMINAL=1 bash "$script")
  launch() {
    if ! command -v "$1" >/dev/null 2>&1; then
      return 1
    fi
    shift
    "$@" && exit 0
    return 1
  }

  launch x-terminal-emulator x-terminal-emulator -e "${child[@]}" \
    || launch gnome-terminal gnome-terminal -- "${child[@]}" \
    || launch kgx kgx -- "${child[@]}" \
    || launch konsole konsole -e "${child[@]}" \
    || launch xfce4-terminal xfce4-terminal -e "env FUSE2_SETUP_TERMINAL=1 bash $(printf '%q' "$script")" \
    || launch mate-terminal mate-terminal -- "${child[@]}" \
    || launch lxterminal lxterminal -e "${child[@]}" \
    || launch tilix tilix -e "${child[@]}" \
    || launch kitty kitty "${child[@]}" \
    || launch alacritty alacritty -e "${child[@]}" \
    || launch wezterm wezterm start -- "${child[@]}" \
    || launch foot foot "${child[@]}" \
    || launch xterm xterm -e "${child[@]}" \
    || true

  echo "Could not open a terminal. Run this instead:"
  echo "  bash \"$script\""
  exit 1
fi

pause() {
  if [[ -t 0 ]]; then
    echo
    read -r -p "Press Enter to close..."
  fi
}
trap pause EXIT

as_root() {
  if [[ "$(id -u)" -eq 0 ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

fuse2_present() {
  if ldconfig -p 2>/dev/null | grep -q 'libfuse\.so\.2'; then
    return 0
  fi

  local candidate
  for candidate in \
    /lib/libfuse.so.2 \
    /lib64/libfuse.so.2 \
    /usr/lib/libfuse.so.2 \
    /usr/lib64/libfuse.so.2 \
    /lib/x86_64-linux-gnu/libfuse.so.2 \
    /usr/lib/x86_64-linux-gnu/libfuse.so.2 \
    /lib/aarch64-linux-gnu/libfuse.so.2 \
    /usr/lib/aarch64-linux-gnu/libfuse.so.2 \
    /lib/i386-linux-gnu/libfuse.so.2 \
    /usr/lib/i386-linux-gnu/libfuse.so.2
  do
    if [[ -e "$candidate" ]]; then
      return 0
    fi
  done

  find /lib /usr/lib /lib64 /usr/lib64 -name 'libfuse.so.2' -print -quit 2>/dev/null | grep -q .
}

script_dir="$(cd "$(dirname "$0")" && pwd)"
if command -v readlink >/dev/null 2>&1; then
  resolved_script="$(readlink -f "$0" 2>/dev/null || true)"
  if [[ -n "$resolved_script" ]]; then
    script_dir="$(cd "$(dirname "$resolved_script")" && pwd)"
  fi
fi

shopt -s nullglob
appimages=("$script_dir"/*.AppImage)
shopt -u nullglob

echo "Arsenal Lua Checker needs FUSE 2 (libfuse.so.2) to open the AppImage."
echo "FUSE 3 is a different library and does not replace it."
echo

need_package=0
if fuse2_present; then
  echo "FUSE 2 is already installed."
else
  need_package=1
  if ldconfig -p 2>/dev/null | grep -q 'libfuse\.so\.3'; then
    echo "FUSE 3 is installed, and FUSE 2 is not. Installing FUSE 2 as well."
  else
    echo "FUSE 2 is not installed."
  fi
fi

need_device=0
if [[ ! -e /dev/fuse || ! -r /dev/fuse || ! -w /dev/fuse ]]; then
  need_device=1
fi

if [[ "$need_package" -eq 1 || "$need_device" -eq 1 ]]; then
  if [[ "$(id -u)" -ne 0 ]]; then
    echo "Administrator rights are required. Enter your password if asked."
    sudo -v || exit 1
  fi
fi

install_apt() {
  export DEBIAN_FRONTEND=noninteractive
  as_root apt-get update || true
  if apt-cache show libfuse2 >/dev/null 2>&1 && as_root apt-get install -y libfuse2; then
    return 0
  fi
  if apt-cache show libfuse2t64 >/dev/null 2>&1 && as_root apt-get install -y libfuse2t64; then
    return 0
  fi
  echo "Could not find libfuse2. Search for \"fuse2\" in your package manager."
  return 1
}

install_pacman() {
  if as_root pacman -S --needed --noconfirm fuse2; then
    return 0
  fi
  as_root pacman -Sy --needed --noconfirm fuse2
}

install_dnf() {
  if as_root dnf install -y fuse-libs; then
    return 0
  fi

  echo "fuse-libs did not match this Fedora version. Searching for libfuse.so.2..."
  local pkg=""
  pkg="$(dnf -q repoquery --whatprovides 'libfuse.so.2()(64bit)' 2>/dev/null | head -n 1 || true)"
  if [[ -z "$pkg" ]]; then
    pkg="$(dnf -q repoquery --whatprovides 'libfuse.so.2' 2>/dev/null | head -n 1 || true)"
  fi
  if [[ -z "$pkg" || "$pkg" == *fuse3* ]]; then
    echo "Could not find a FUSE 2 package. Search for \"fuse2\" in your package manager."
    return 1
  fi
  as_root dnf install -y "$pkg"
}

install_zypper() {
  if as_root zypper --non-interactive install libfuse2; then
    return 0
  fi
  echo "Could not find libfuse2. Search for \"fuse2\" in your package manager."
  return 1
}

install_apk() {
  if as_root apk add fuse2; then
    return 0
  fi
  as_root apk add fuse
}

install_xbps() {
  if as_root xbps-install -Sy fuse2; then
    return 0
  fi
  as_root xbps-install -Sy fuse
}

install_eopkg() {
  if as_root eopkg install --yes-all fuse2; then
    return 0
  fi
  as_root eopkg install --yes-all fuse
}

detect_pm() {
  local id="" id_like=""
  if [[ -r /etc/os-release ]]; then
    # shellcheck disable=SC1091
    . /etc/os-release
    id="${ID-}"
    id_like="${ID_LIKE-}"
  fi

  case "$id" in
    arch|cachyos|endeavouros|manjaro|artix|garuda|archcraft) echo pacman; return ;;
    debian|ubuntu|linuxmint|pop|elementary|zorin|kali|raspbian|neon) echo apt; return ;;
    fedora|rhel|centos|nobara|rocky|alma|ol) echo dnf; return ;;
    opensuse*|sles) echo zypper; return ;;
    alpine) echo apk; return ;;
    void) echo xbps; return ;;
    solus) echo eopkg; return ;;
  esac

  case "$id_like" in
    *arch*) echo pacman; return ;;
    *debian*|*ubuntu*) echo apt; return ;;
    *fedora*|*rhel*) echo dnf; return ;;
    *suse*) echo zypper; return ;;
  esac

  if command -v pacman >/dev/null 2>&1; then echo pacman; return; fi
  if command -v apt-get >/dev/null 2>&1; then echo apt; return; fi
  if command -v dnf >/dev/null 2>&1; then echo dnf; return; fi
  if command -v zypper >/dev/null 2>&1; then echo zypper; return; fi
  if command -v apk >/dev/null 2>&1; then echo apk; return; fi
  if command -v xbps-install >/dev/null 2>&1; then echo xbps; return; fi
  if command -v eopkg >/dev/null 2>&1; then echo eopkg; return; fi
  echo unknown
}

if [[ "$need_package" -eq 1 ]]; then
  pm="$(detect_pm)"
  echo "Installing FUSE 2 with ${pm}..."
  case "$pm" in
    apt) install_apt ;;
    pacman) install_pacman ;;
    dnf) install_dnf ;;
    zypper) install_zypper ;;
    apk) install_apk ;;
    xbps) install_xbps ;;
    eopkg) install_eopkg ;;
    *)
      echo "This distro was not recognized. Install FUSE 2, not FUSE 3:"
      echo "  Arch-based:          sudo pacman -S fuse2"
      echo "  Debian/Ubuntu/Mint:  sudo apt install libfuse2"
      echo "  Fedora:              sudo dnf install fuse-libs"
      echo "If the Fedora package name does not match, search for \"fuse2\"."
      exit 1
      ;;
  esac

  as_root ldconfig || true

  if ! fuse2_present; then
    echo "FUSE 2 is still missing. libfuse.so.2 was not found after installation."
    echo "FUSE 3 does not cover this. Search for \"fuse2\" in your package manager."
    exit 1
  fi
  echo "FUSE 2 is installed."
fi

if [[ ! -e /dev/fuse ]]; then
  echo "Loading the fuse kernel module..."
  as_root modprobe fuse || true
fi

real_user="${SUDO_USER:-${USER-}}"
if [[ -e /dev/fuse && ( ! -r /dev/fuse || ! -w /dev/fuse ) ]]; then
  if [[ -n "$real_user" ]] && getent group fuse >/dev/null 2>&1 && ! id -nG "$real_user" | tr ' ' '\n' | grep -qx fuse; then
    echo "Adding ${real_user} to the fuse group..."
    as_root usermod -aG fuse "$real_user"
    echo "Log out and back in so the fuse group applies, then open the AppImage."
  else
    echo "Granting access to /dev/fuse..."
    as_root chmod 666 /dev/fuse
  fi
fi

if [[ "${#appimages[@]}" -eq 0 ]]; then
  echo "No AppImage was found next to this file. FUSE 2 setup is done."
  exit 0
fi

for appimage in "${appimages[@]}"; do
  if [[ ! -x "$appimage" ]]; then
    chmod +x "$appimage" 2>/dev/null || as_root chmod +x "$appimage"
  fi
  echo "Ready: $(basename "$appimage")"
done
