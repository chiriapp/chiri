<div align="center">
  <div style="display:flex;flex-direction:column;gap:15px;align-items:center;">
    <img src="./public/icon.png" width="100" />
    <h1>Chiri</h1>
  </div>

  <p>🍃 Cross-platform CalDAV-compatible task management app.</p>

  <!-- header badges start -->
  [![GitHub Repo stars][header-repo-stars-badge]][repo-stars]
  &nbsp;[![Total downloads][header-repo-total-downloads-badge]][repo-releases]
  &nbsp;[![Ko-fi donation link][header-donate-kofi-badge]][donate-kofi]
  &nbsp;[![Liberapay donation link][header-donate-liberapay-badge]][donate-liberapay]
  &nbsp;[![GitHub License][header-repo-license-badge]][repo-license]
  <!-- header badges end -->

  ![A screenshot of Chiri, a cross-platform CalDAV compatible task management app. The sidebar shows the "RustiCal (chloe)" account with the "Albums to listen to" calendar selected. The tasks are music albums that I plan on listening to, ranging from "Revengeseekerz by Jane Remover" and "Hearth Room by Frost Children" to "girl EDM by Ninajirachi" and "10,000 gecs by 100 gecs".][header-screenshot]
</div>

## Disclaimer
> [!IMPORTANT]  
> Though the app is functional, it is currently still in active development so you might encounter bugs here and there.  
If you do, [file a bug report][header-repo-issues-link] and let me know.

# Download
You can download pre-built binaries of the application for each platform by clicking on one of the following links.

<!-- download badges start -->
[<img src="./.github/assets/download/windows_msi_x64.png" width="200">][release-windows-msi-x64]
[<img src="./.github/assets/download/windows_msi_arm.png" width="200">][release-windows-msi-arm]
[<img src="./.github/assets/download/macos_dmg_applesilicon.png" width="200">][release-macos-dmg-applesilicon]
[<img src="./.github/assets/download/macos_dmg_intel.png" width="200">][release-macos-dmg-intel]
[<img src="./.github/assets/download/linux_deb_x86_64.png" width="200">][release-linux-deb-x86_64]
[<img src="./.github/assets/download/linux_deb_arm.png" width="200">][release-linux-deb-arm]
[<img src="./.github/assets/download/linux_rpm_x86_64.png" width="200">][release-linux-rpm-x86_64]
[<img src="./.github/assets/download/linux_rpm_arm.png" width="200">][release-linux-rpm-arm]
<!-- download badges end -->

> [!NOTE]  
> Flatpak and AppImage support is planned in a future release.

<details>
<summary>Instructions for Arch Linux</summary>

## Arch Linux
Chiri is available on the AUR (Arch User Repository) in two variants:

### Building from source
```bash
yay -S chiri # or `paru -S chiri`

# Or manually
git clone https://aur.archlinux.org/chiri.git
cd chiri
makepkg -si
```

### Pre-built binary (faster installation)
```bash
yay -S chiri-bin # or `paru -S chiri-bin`

# Or manually
git clone https://aur.archlinux.org/chiri-bin.git
cd chiri-bin
makepkg -si
```
</details>

<details>
<summary>Instructions for Nix / NixOS</summary>

## Nix / NixOS
Chiri is available for Nix, NixOS, and nix-darwin as a flake. A pre-built binary is also available.

### Flake
> Until the app is officially published to `nixpkgs`, you'll have to use a flake input for the time being.

Add `chiri` as an input to your `flake.nix` file.
```nix
{
  inputs = {
    # ... other inputs ...
    chiri = {
      url = "github:SapphoSys/chiri";
      inputs.nixpkgs.follows = "nixpkgs";
    };
    # ... other inputs ...
  };
}
```

### Examples
<details>
  <summary>NixOS</summary>

  ```nix
  # flake.nix
  {
    inputs = {
      nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
      chiri = {
        url = "github:SapphoSys/chiri";
        inputs.nixpkgs.follows = "nixpkgs";
      };
    };
    outputs = { nixpkgs, chiri, ... }: {
      nixosConfigurations.your-hostname = nixpkgs.lib.nixosSystem {
        system = "x86_64-linux"; # Or "aarch64-linux"
        modules = [
          {
            environment.systemPackages = [
              chiri.packages.x86_64-linux.default
              # Or "chiri.packages.x86_64-linux.bin" for a pre-built binary
            ];
          }
          # ... etc
        ];
      };
    };
  }
  ```
</details>

<details>
  <summary>Home Manager</summary>

  ```nix
  { pkgs, inputs, ... }:
  {
    home.packages = [
      inputs.chiri.packages.${pkgs.system}.default
      # Or "inputs.chiri.packages.${pkgs.system}.bin" for a pre-built binary
    ];
  }
  ```
</details>

<details>
  <summary>macOS (nix-darwin)</summary>
  
  ```nix
  # flake.nix
  {
    inputs = {
      nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
      darwin = {
        url = "github:LnL7/nix-darwin";
        inputs.nixpkgs.follows = "nixpkgs";
      };
      chiri = {
        url = "github:SapphoSys/chiri";
        inputs.nixpkgs.follows = "nixpkgs";
      };
    };
    outputs = { nixpkgs, darwin, chiri, ... }: {
      darwinConfigurations.your-macbook = darwin.lib.darwinSystem {
        system = "aarch64-darwin"; # Or "x86_64-darwin"
        modules = [
          {
            environment.systemPackages = [
              chiri.packages.aarch64-darwin.default
              # Or "chiri.packages.aarch64-darwin.bin" for a pre-built binary
            ];
          }
        ];
      };
    };
  }
  ```
</details>
</details>

# Support
If you found Chiri useful, please consider donating! 

I work on Chiri during my free time as a student, so every amount, however small, helps with rent and food costs. Thank you :)

<!-- donation badges start -->
[<img src="./.github/assets/donate/ko-fi.png" width="264">][donate-kofi]
[<img src="./.github/assets/donate/liberapay.png" width="264">][donate-liberapay]
<!-- donation badges end -->

# Compatibility
Does the app work on other CalDAV servers or CalDAV-compatible clients that are not listed here? [Please let me know by filing an issue](https://github.com/SapphoSys/chiri/issues/new)!

## Servers
| Server              | Support |
| ------------------- | ------- |
| Nextcloud Tasks     | ✅      |
| Baikal              | ✅      |
| Radicale            | ✅      |
| RustiCal            | ✅      |
| Fastmail            | ✅      |

## Clients
| Client              | Support |
| ------------------- | ------- |
| DAVx⁵               | ✅      |
| Apple Reminders     | ✅      |
| Tasks.org           | ✅      |
| jtx Board           | ✅      |

# License
Chiri is licensed under the [<span aria-hidden="true">&nearr;</span> zlib/libpng][repo-license] license.

[donate-kofi]: https://ko-fi.com/solelychloe
[donate-liberapay]: https://liberapay.com/chloe

[header-donate-kofi-badge]: https://img.shields.io/badge/donate-kofi-f5c2e7?style=plastic&logo=kofi&logoColor=f5c2e7&labelColor=18181b&cacheSeconds=1000
[header-donate-liberapay-badge]: https://img.shields.io/badge/donate-liberapay-f5c2e7?style=plastic&logo=liberapay&logoColor=f5c2e7&labelColor=18181b&cacheSeconds=1000
[header-repo-license-badge]: https://img.shields.io/github/license/SapphoSys/chiri?style=plastic&labelColor=18181b&color=f5c2e7&cacheSeconds=1000
[header-repo-stars-badge]: https://img.shields.io/github/stars/SapphoSys/chiri?style=plastic&logo=github&logoColor=f5c2e7&labelColor=18181b&color=f5c2e7&cacheSeconds=1000
[header-repo-total-downloads-badge]: https://img.shields.io/github/downloads/SapphoSys/chiri/total?style=plastic&logo=hack-the-box&logoColor=f5c2e7&label=downloads&labelColor=18181b&color=f5c2e7&cacheSeconds=1000

[header-repo-issues-link]: https://github.com/SapphoSys/chiri/issues
[header-screenshot]: https://raw.githubusercontent.com/SapphoSys/chiri/refs/heads/master/.github/assets/screenshot.png

[release-windows-msi-x64]: https://github.com/SapphoSys/chiri/releases/download/app-v0.8.1/chiri_0.8.1_x64_en-US.msi
[release-windows-msi-arm]: https://github.com/SapphoSys/chiri/releases/download/app-v0.8.1/chiri_0.8.1_arm64_en-US.msi
[release-macos-dmg-applesilicon]: https://github.com/SapphoSys/chiri/releases/download/app-v0.8.1/chiri_0.8.1_aarch64.dmg
[release-macos-dmg-intel]: https://github.com/SapphoSys/chiri/releases/download/app-v0.8.1/chiri_0.8.1_x64.dmg
[release-linux-deb-x86_64]: https://github.com/SapphoSys/chiri/releases/download/app-v0.8.1/chiri_0.8.1_amd64.deb
[release-linux-deb-arm]: https://github.com/SapphoSys/chiri/releases/download/app-v0.8.1/chiri_0.8.1_arm64.deb
[release-linux-rpm-x86_64]: https://github.com/SapphoSys/chiri/releases/download/app-v0.8.1/chiri-0.8.1-1.x86_64.rpm
[release-linux-rpm-arm]: https://github.com/SapphoSys/chiri/releases/download/app-v0.8.1/chiri-0.8.1-1.aarch64.rpm

[repo-license]: https://github.com/SapphoSys/chiri/blob/master/LICENSE
[repo-releases]: https://github.com/SapphoSys/chiri/releases
[repo-stars]: https://github.com/SapphoSys/chiri/stargazers
