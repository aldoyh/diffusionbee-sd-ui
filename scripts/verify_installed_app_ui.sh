#!/usr/bin/env bash
# Launch the installed diffusionbee-gui.app, verify the modern homepage UI,
# submit an Arabic prompt, wait for generation, and capture proof screenshots.
set -euo pipefail

APP_PATH="/Applications/diffusionbee-gui.app"
PROCESS_NAME="diffusionbee-gui"
OUT_DIR="${1:-$(cd "$(dirname "$0")/.." && pwd)/docs/screenshots/verify-run-$(date +%Y%m%d-%H%M%S)}"
PROMPT_AR="منظر جميل لإطلالة على البحر"
IMAGES_DIR="${HOME}/.diffusionbee/images"
MAX_GENERATION_WAIT=420

mkdir -p "$OUT_DIR"

log() { printf '[verify] %s\n' "$1"; }
fail() { printf '[verify] FAIL: %s\n' "$1" >&2; exit 1; }

if [[ ! -d "$APP_PATH" ]]; then
  fail "Installed app not found at $APP_PATH"
fi

log "Checking installed bundle contains prompt fixes..."
ASAR_EXTRACT_DIR="$(mktemp -d)"
cleanup() { rm -rf "$ASAR_EXTRACT_DIR"; }
trap cleanup EXIT
ASAR_CLI="${ASAR_CLI:-$(cd "$(dirname "$0")/../electron_app" && node -e "
const fs=require('fs'),path=require('path');
const candidates=[
  path.join(process.cwd(),'node_modules','@electron','asar','bin','asar.js'),
  path.join(process.cwd(),'node_modules','.pnpm','@electron+asar@3.4.1','node_modules','@electron','asar','bin','asar.js'),
];
console.log(candidates.find(p=>fs.existsSync(p))||'');
" 2>/dev/null)}"
if [[ ! -f "$ASAR_CLI" ]]; then
  fail "Could not locate @electron/asar CLI for bundle verification"
fi
node "$ASAR_CLI" extract "$APP_PATH/Contents/Resources/app.asar" "$ASAR_EXTRACT_DIR"
APP_JS="$(find "$ASAR_EXTRACT_DIR/js" -maxdepth 1 -name 'app.*.js' ! -name '*.map' | head -1)"
[[ -n "$APP_JS" ]] || fail "Could not find app bundle JS inside installed app.asar"
if ! rg -q "CLIP tokens|scenic view" "$APP_JS"; then
  fail "Installed app bundle is missing prompt_utils fixes"
fi
if ! rg -q "What will you create today" "$APP_JS"; then
  fail "Installed app bundle is missing modern homepage UI"
fi
log "Bundle contains updated prompt handling and homepage UI code."

log "Stopping any running instances..."
osascript -e "tell application \"$PROCESS_NAME\" to quit" >/dev/null 2>&1 || true
pkill -x "$PROCESS_NAME" >/dev/null 2>&1 || true
sleep 2

before_count=0
if [[ -d "$IMAGES_DIR" ]]; then
  before_count=$(find "$IMAGES_DIR" -maxdepth 1 -name '*.png' -type f 2>/dev/null | wc -l | tr -d ' ')
fi

log "Launching $APP_PATH"
open -a "$APP_PATH"
sleep 3

has_window_bounds() {
  osascript <<APPLESCRIPT 2>/dev/null | grep -q .
tell application "System Events"
  tell process "$PROCESS_NAME"
    if (count of windows) > 0 then
      set winPos to position of window 1
      set winSize to size of window 1
      return (item 1 of winPos as string) & "," & (item 2 of winPos as string) & "," & (item 1 of winSize as string) & "," & (item 2 of winSize as string)
    end if
  end tell
end tell
APPLESCRIPT
}

log "Waiting for $PROCESS_NAME window..."
ready=0
for _ in $(seq 1 90); do
  if osascript -e "tell application \"System Events\" to return (exists process \"$PROCESS_NAME\")" 2>/dev/null | grep -q true; then
    if has_window_bounds; then
      ready=1
      break
    fi
  fi
  sleep 2
done
[[ "$ready" -eq 1 ]] || fail "App window did not appear within 3 minutes"

osascript <<APPLESCRIPT
tell application "System Events"
  tell process "$PROCESS_NAME"
    set frontmost to true
    set position of window 1 to {80, 50}
    set size of window 1 to {1280, 900}
  end tell
end tell
APPLESCRIPT
sleep 2

get_bounds() {
  osascript <<APPLESCRIPT
tell application "System Events"
  tell process "$PROCESS_NAME"
    set frontmost to true
    set winPos to position of window 1
    set winSize to size of window 1
    return (item 1 of winPos as string) & "," & (item 2 of winPos as string) & "," & (item 1 of winSize as string) & "," & (item 2 of winSize as string)
  end tell
end tell
APPLESCRIPT
}

capture() {
  local file="$1"
  local bounds
  bounds="$(get_bounds)"
  screencapture -o -x -R"${bounds}" "$OUT_DIR/$file"
  log "Screenshot: $OUT_DIR/$file"
}

focus_app() {
  osascript -e "tell application \"System Events\" to set frontmost of process \"$PROCESS_NAME\" to true" >/dev/null
  sleep 0.35
}

scroll_home_top() {
  focus_app
  osascript <<APPLESCRIPT
tell application "System Events"
  tell process "$PROCESS_NAME"
    key code 115
  end tell
end tell
APPLESCRIPT
  sleep 0.5
}

capture "01-launched-homepage.png"

log "Waiting for homepage route to finish loading..."
home_ready=0
for _ in $(seq 1 30); do
  window_title="$(osascript <<'APPLESCRIPT'
tell application "System Events"
  tell process "diffusionbee-gui"
    return name of window 1
  end tell
end tell
APPLESCRIPT
)"
  if echo "$window_title" | rg -qi "Home"; then
    home_ready=1
    break
  fi
  sleep 2
done
[[ "$home_ready" -eq 1 ]] || log "Window title still '${window_title:-<empty>}' — continuing with screenshot checks."

log "Verifying modern homepage UI markers..."
window_title="$(osascript <<'APPLESCRIPT'
tell application "System Events"
  tell process "diffusionbee-gui"
    return name of window 1
  end tell
end tell
APPLESCRIPT
)"
echo "$window_title" > "$OUT_DIR/window-title.txt"

ui_dump="$(osascript <<'APPLESCRIPT'
tell application "System Events"
  tell process "diffusionbee-gui"
    set namesList to {}
    repeat with el in (entire contents of window 1)
      try
        set end of namesList to (name of el as string)
      end try
    end repeat
    return namesList as string
  end tell
end tell
APPLESCRIPT
)"
echo "$ui_dump" > "$OUT_DIR/ui-accessibility-names.txt"

has_home_window=0
has_old_txt2img=0
if echo "$window_title" | rg -qi "Home|DiffusionBee GUI"; then
  has_home_window=1
fi
if echo "$ui_dump" | rg -q "Reset to default|Negative Prompt|Add to Queue"; then
  has_old_txt2img=1
fi

[[ "$has_home_window" -eq 1 ]] || fail "Expected Home window title, got: ${window_title:-<empty>}"
[[ "$has_old_txt2img" -eq 0 ]] || fail "Legacy txt2img form detected on homepage (cluttered UI)"

log "Homepage UI checks passed (Home window, no legacy txt2img form on homepage)."

log "Switching to Arabic via bottom-right language control..."
focus_app
bounds="$(get_bounds)"
x="$(echo "$bounds" | cut -d, -f1)"
y="$(echo "$bounds" | cut -d, -f2)"
width="$(echo "$bounds" | cut -d, -f3)"
height="$(echo "$bounds" | cut -d, -f4)"
lang_x=$((x + width - 90))
lang_y=$((y + height - 28))
cliclick "c:${lang_x},${lang_y}"
sleep 1.5
capture "02-arabic-homepage.png"

log "Submitting Arabic prompt via chat input..."
bounds="$(get_bounds)"
x="$(echo "$bounds" | cut -d, -f1)"
y="$(echo "$bounds" | cut -d, -f2)"
# Chat input sits in the lower third of the welcome hero.
click_x=$((x + 640))
click_y=$((y + 520))
focus_app
cliclick "c:${click_x},${click_y}"
sleep 0.4
cliclick "t:${PROMPT_AR}"
sleep 0.5
osascript <<'APPLESCRIPT'
tell application "System Events"
  tell process "diffusionbee-gui"
    key code 36
  end tell
end tell
APPLESCRIPT

capture "03-after-prompt-submit.png"

log "Waiting for backend/model readiness and image generation (up to ${MAX_GENERATION_WAIT}s)..."
generated=0
start_ts=$(date +%s)
while true; do
  now=$(date +%s)
  elapsed=$((now - start_ts))
  if [[ "$elapsed" -ge "$MAX_GENERATION_WAIT" ]]; then
    break
  fi

  if [[ -d "$IMAGES_DIR" ]]; then
    after_count=$(find "$IMAGES_DIR" -maxdepth 1 -name '*.png' -type f 2>/dev/null | wc -l | tr -d ' ')
    if [[ "$after_count" -gt "$before_count" ]]; then
      newest=$(ls -t "$IMAGES_DIR"/*.png 2>/dev/null | head -1)
      if [[ -n "$newest" ]]; then
        cp "$newest" "$OUT_DIR/04-generated-image.png"
        log "New image detected: $newest"
        generated=1
        break
      fi
    fi
  fi

  if (( elapsed % 30 == 0 && elapsed > 0 )); then
    capture "wait-${elapsed}s.png"
  fi
  sleep 5
done

scroll_home_top
sleep 1
capture "05-final-homepage-state.png"

if [[ "$generated" -ne 1 ]]; then
  fail "No new image appeared in $IMAGES_DIR within ${MAX_GENERATION_WAIT}s"
fi

log "Checking final UI does not show token-length error..."
if osascript <<'APPLESCRIPT' 2>/dev/null | rg -qi "too long|340 token|Error"
tell application "System Events"
  tell process "diffusionbee-gui"
    set namesList to {}
    repeat with el in (entire contents of window 1)
      try
        set end of namesList to (name of el as string)
      end try
    end repeat
    return namesList as string
  end tell
end tell
APPLESCRIPT
then
  fail "Token-length error still visible in UI"
fi

log "SUCCESS: Installed app UI verified and image generated."
log "Artifacts saved in $OUT_DIR"
printf '%s\n' "$OUT_DIR"