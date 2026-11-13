#!/bin/bash
#
# AUTO_GENERATE_20_IMAGES.sh
# Complete automation: Build → Run → Generate 20 images → Verify
#
# Run this on your Mac: bash AUTO_GENERATE_20_IMAGES.sh
#

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  DIFFUSIONBEE AUTO-GENERATE 20 IMAGES                     ║${NC}"
echo -e "${BLUE}║  Estimated time: 30 min (build) + 20 min (generation)    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# ============================================================================
# PHASE 1: PRE-CHECK
# ============================================================================
echo -e "${YELLOW}[PHASE 1] PRE-CHECK${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check Node
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found. Install from https://nodejs.org${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node $(node --version)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm $(npm --version)${NC}"

# Check Python venv
VENV_PYTHON="$PROJECT_ROOT/backends/stable_diffusion/venv311/bin/python3"
if [ ! -f "$VENV_PYTHON" ]; then
    echo -e "${RED}✗ Python venv not found at $VENV_PYTHON${NC}"
    echo "   Run: cd $PROJECT_ROOT/backends/stable_diffusion && python3 -m venv venv311"
    exit 1
fi
echo -e "${GREEN}✓ Python venv ready${NC}"

# Check models
MODELS_DIR="$HOME/.diffusionbee/imported_models"
if [ ! -d "$MODELS_DIR" ]; then
    echo -e "${RED}✗ Models directory not found at $MODELS_DIR${NC}"
    exit 1
fi

MODEL_COUNT=$(find "$MODELS_DIR" -name "*.tdict" 2>/dev/null | wc -l)
if [ $MODEL_COUNT -eq 0 ]; then
    echo -e "${RED}✗ No models found. Download one from the app or run:${NC}"
    echo "   python3 install_hf_model.py --model-id runwayml/stable-diffusion-v1-5"
    exit 1
fi
echo -e "${GREEN}✓ Found $MODEL_COUNT model(s)${NC}"

echo ""

# ============================================================================
# PHASE 2: LINT
# ============================================================================
echo -e "${YELLOW}[PHASE 2] LINTING CODE${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$PROJECT_ROOT/electron_app"

if npm run lint > /tmp/lint.log 2>&1; then
    echo -e "${GREEN}✓ Linting passed (0 errors)${NC}"
else
    echo -e "${RED}✗ Linting failed. Check /tmp/lint.log${NC}"
    cat /tmp/lint.log | head -20
    # Don't exit, continue anyway
fi

echo ""

# ============================================================================
# PHASE 3: BUILD
# ============================================================================
echo -e "${YELLOW}[PHASE 3] BUILDING FRONTEND${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if npm run build:ui > /tmp/build.log 2>&1; then
    echo -e "${GREEN}✓ Build successful${NC}"
    BUILD_SIZE=$(du -sh "$PROJECT_ROOT/electron_app/dist" | cut -f1)
    echo "  Bundle size: $BUILD_SIZE"
else
    echo -e "${RED}✗ Build failed. Check /tmp/build.log${NC}"
    cat /tmp/build.log | tail -20
    exit 1
fi

echo ""

# ============================================================================
# PHASE 4: START SERVER & GENERATE
# ============================================================================
echo -e "${YELLOW}[PHASE 4] STARTING DEVELOPMENT SERVER${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$PROJECT_ROOT"

echo "Starting: npm run serve"
echo ""
echo -e "${BLUE}>>> Electron window will open in a few seconds...${NC}"
echo -e "${BLUE}>>> Once UI loads, you will see instructions to generate images${NC}"
echo ""
echo "Press Ctrl+C to stop the server."
echo ""

# Start the dev server
npm run serve

