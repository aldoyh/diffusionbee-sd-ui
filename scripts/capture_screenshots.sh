#!/usr/bin/env bash
# Capture DiffusionBee UI screenshots from a running Electron window (macOS).
set -euo pipefail

OUT_DIR="${1:-$(cd "$(dirname "$0")/.." && pwd)/docs/screenshots}"
mkdir -p "$OUT_DIR"

# Calibrated cliclick indices (32px row stride from sidebar top).
# 0 Home | 1 Txt2Img | 3 Img2Img | 4 Inpainting | 6 Upscaler | 7 Models | 9 History
SIDEBAR_INDICES=(0 1 3 4 6 7 9)

focus_app() {
  osascript -e 'tell application "System Events" to set frontmost of process "Electron" to true' >/dev/null
  sleep 0.35
}

get_bounds() {
  osascript <<'APPLESCRIPT'
tell application "System Events"
  tell process "Electron"
    set frontmost to true
    set winPos to position of window 1
    set winSize to size of window 1
    return (item 1 of winPos as string) & "," & (item 2 of winPos as string) & "," & (item 1 of winSize as string) & "," & (item 2 of winSize as string)
  end tell
end tell
APPLESCRIPT
}

resize_window() {
  local w="${1:-1280}"
  local h="${2:-900}"
  osascript <<APPLESCRIPT
tell application "System Events"
  tell process "Electron"
    set frontmost to true
    set position of window 1 to {80, 50}
    set size of window 1 to {$w, $h}
  end tell
end tell
APPLESCRIPT
  sleep 1.0
}

capture_window() {
  local file="$1"
  focus_app
  local bounds
  bounds="$(get_bounds)"
  screencapture -o -x -R"${bounds}" "$OUT_DIR/$file"
  echo "Saved $OUT_DIR/$file"
}

scroll_home_to_top() {
  focus_app
  osascript <<'APPLESCRIPT'
tell application "System Events"
  tell process "Electron"
    set frontmost to true
    key code 115
  end tell
end tell
APPLESCRIPT
  sleep 0.5
}

click_sidebar_index() {
  local index="$1"
  focus_app
  local bounds x y
  bounds="$(get_bounds)"
  x="$(echo "$bounds" | cut -d, -f1)"
  y="$(echo "$bounds" | cut -d, -f2)"
  local click_x=$((x + 100))
  local click_y=$((y + 104 + index * 32))
  cliclick "c:${click_x},${click_y}"
  sleep 1.5
}

navigate_to_slot() {
  local slot="$1"
  local index="${SIDEBAR_INDICES[$slot]}"
  click_sidebar_index 0
  if [[ "$index" -gt 0 ]]; then
    click_sidebar_index "$index"
  fi
}

click_lang_toggle() {
  osascript <<'APPLESCRIPT'
tell application "System Events"
  tell process "Electron"
    set frontmost to true
    repeat with el in (entire contents of window 1)
      try
        if name of el is "العربية" then
          click el
          exit repeat
        end if
      end try
    end repeat
  end tell
end tell
APPLESCRIPT
  sleep 1.0
}

click_ui_named() {
  local needle="$1"
  osascript <<APPLESCRIPT
tell application "System Events"
  tell process "Electron"
    set frontmost to true
    repeat with el in (entire contents of window 1)
      try
        set n to name of el as string
        if n contains "$needle" then
          click el
          exit repeat
        end if
      end try
    end repeat
  end tell
end tell
APPLESCRIPT
}

echo "Waiting for Diffusion SD UI (Electron) window..."
for i in $(seq 1 90); do
  if osascript -e 'tell application "System Events" to return (exists process "Electron")' 2>/dev/null | grep -q true; then
    if get_bounds >/dev/null 2>&1; then
      break
    fi
  fi
  sleep 2
done

resize_window 1280 900
focus_app
sleep 2

navigate_to_slot 0
scroll_home_to_top
capture_window "01-homepage.png"
cp "$OUT_DIR/01-homepage.png" "$OUT_DIR/01-homepage-welcome-carousel.png"

navigate_to_slot 1
capture_window "02-txt2img-ui.png"

navigate_to_slot 2
capture_window "03-img2img.png"

navigate_to_slot 3
capture_window "04-inpainting.png"

navigate_to_slot 4
capture_window "05-upscaler.png"

navigate_to_slot 5
capture_window "06-models.png"

navigate_to_slot 6
capture_window "07-history.png"

navigate_to_slot 0
scroll_home_to_top
click_lang_toggle
capture_window "08-homepage-arabic.png"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
python3 "$ROOT/scripts/prepare_doc_screenshots.py" || true
python3 "$ROOT/scripts/compose_txt2img_screenshot.py" || true

echo "Screenshot capture complete."