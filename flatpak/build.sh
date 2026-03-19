#!/bin/bash
# Quick build script for testing Flatpak locally

set -e

echo "🔨 Building Chiri Flatpak..."
echo ""

# Initialize git submodules
if [ ! -f "shared-modules/README.md" ]; then
    echo "📦 Initializing git submodules..."
    git submodule update --init
    echo ""
fi

# Check if flatpak-builder is installed
if ! command -v flatpak-builder &> /dev/null; then
    echo "❌ flatpak-builder not found. Please install it:"
    echo "   Debian/Ubuntu: sudo apt install flatpak-builder"
    echo "   Fedora:        sudo dnf install flatpak-builder"
    echo "   Arch:          sudo pacman -S flatpak-builder"
    exit 1
fi

# Check if runtime is installed
if ! flatpak info --user org.gnome.Platform//48 &> /dev/null; then
    echo "📦 Installing GNOME 48 runtime..."
    flatpak install --user -y flathub org.gnome.Platform//48 org.gnome.Sdk//48
fi

# Build
echo "🏗️  Building Flatpak..."
flatpak-builder --user --force-clean build-dir moe.sapphic.Chiri.yml

# Install
echo "📦 Installing locally..."
flatpak-builder --user --install --force-clean build-dir moe.sapphic.Chiri.yml

echo ""
echo "✅ Build complete!"
echo ""
echo "To test, run:"
echo "  flatpak run moe.sapphic.Chiri 2>&1 | grep -i 'tray\|icon\|error'"
echo ""
echo "Or just run normally:"
echo "  flatpak run moe.sapphic.Chiri"
echo ""
