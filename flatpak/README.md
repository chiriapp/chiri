# Flatpak Packaging for Chiri

This directory contains the necessary files to build and distribute Chiri as a Flatpak.

## Files

- **moe.sapphic.Chiri.yml** - Flatpak manifest (build instructions)
- **moe.sapphic.Chiri.metainfo.xml** - AppStream metadata for app stores
- **moe.sapphic.Chiri.desktop** - Desktop entry file

## Prerequisites

Install Flatpak tools:

```bash
# Debian/Ubuntu
sudo apt install flatpak flatpak-builder

# Fedora
sudo dnf install flatpak flatpak-builder

# Arch Linux
sudo pacman -S flatpak flatpak-builder
```

Add the Flathub repository and install the GNOME runtime:

```bash
flatpak remote-add --user --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
flatpak install --user flathub org.gnome.Platform//48 org.gnome.Sdk//48
```

## Building Locally

### Step 0: Initialize submodules

This Flatpak uses the Flathub shared-modules for common dependencies:

```bash
# From the flatpak/ directory
git submodule update --init
```

### Step 1: Update the SHA256 checksum

Before building, you need to update the SHA256 checksum in the manifest:

```bash
# Download your .deb file
wget https://github.com/SapphoSys/chiri/releases/download/v0.7.1/chiri_0.7.1_amd64.deb

# Get the SHA256 checksum
sha256sum chiri_0.7.1_amd64.deb

# Update the sha256 field in moe.sapphic.Chiri.yml
```

### Step 2: Build the Flatpak

```bash
cd flatpak/
flatpak-builder --user --force-clean build-dir moe.sapphic.Chiri.yml
```

### Step 3: Install locally

```bash
flatpak-builder --user --install --force-clean build-dir moe.sapphic.Chiri.yml
```

### Step 4: Run the app

```bash
flatpak run moe.sapphic.Chiri
```

## Creating a Bundle for Distribution

If you want to share the Flatpak as a single file:

```bash
# Export to a repository
flatpak build-export repo build-dir

# Create a single-file bundle
flatpak build-bundle repo chiri.flatpak moe.sapphic.Chiri \
  --runtime-repo=https://flathub.org/repo/flathub.flatpakrepo

# Users can install with:
# flatpak install --user chiri.flatpak
```

## Submitting to Flathub

1. **Test locally first** to ensure everything works
2. **Fork the Flathub repository**: https://github.com/flathub/flathub
3. **Clone your fork**:
   ```bash
   git clone --branch=new-pr git@github.com:YOUR_USERNAME/flathub.git
   cd flathub
   ```
4. **Create a branch**:
   ```bash
   git checkout -b chiri
   ```
5. **Copy the manifest files** to the repository root
6. **Commit and push**:
   ```bash
   git add moe.sapphic.Chiri.yml
   git add moe.sapphic.Chiri.metainfo.xml
   git add moe.sapphic.Chiri.desktop
   git commit -m "Add Chiri"
   git push origin chiri
   ```
7. **Open a Pull Request** against the `new-pr` branch on flathub/flathub
8. **Wait for review** - Flathub maintainers will review your submission
9. **Once approved**, you'll receive maintainer access to update the app

## Permissions Explained

The app requires these permissions:

- `--socket=wayland` / `--socket=fallback-x11` - Display the window
- `--share=ipc` - Required for X11 shared memory (improves performance)
- `--device=dri` - GPU acceleration
- `--share=network` - CalDAV server synchronization
- `--talk-name=org.freedesktop.Notifications` - Show notifications
- `--talk-name=org.kde.StatusNotifierWatcher` - System tray icon (if used)

## Data Storage

Under Flatpak, app data is stored in:
- **Data**: `~/.var/app/moe.sapphic.Chiri/data/`
- **Config**: `~/.var/app/moe.sapphic.Chiri/config/`
- **Cache**: `~/.var/app/moe.sapphic.Chiri/cache/`

Tauri automatically handles XDG base directory paths, so no code changes are needed.

## Automatic Updates

The manifest includes `x-checker-data` which enables Flathub's [external-data-checker](https://github.com/flathub-infra/flatpak-external-data-checker) to automatically:
- Check for new releases on GitHub
- Create pull requests when updates are available
- Keep the Flatpak version in sync with your releases

## Troubleshooting

### Black/blank window
Make sure you're building with `tauri build` (not separate frontend + cargo build).
The Tauri CLI properly embeds frontend assets.

### Database not found
The database is automatically stored in the Flatpak app data directory.
No changes needed - Tauri handles this correctly.

### File chooser doesn't work
Tauri uses XDG Desktop Portals automatically on Linux, which work seamlessly with Flatpak.

### Network requests fail
Ensure `--share=network` is in the `finish-args` section of the manifest.

## References

- [Flatpak Documentation](https://docs.flatpak.org/)
- [Tauri Flatpak Guide](https://v2.tauri.app/distribute/flatpak/)
- [Flathub Submission Guide](https://docs.flathub.org/docs/for-app-authors/submission)
- [AppStream MetaInfo Creator](https://www.freedesktop.org/software/appstream/metainfocreator/)
