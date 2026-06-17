<div align="center">
  <div style="display:flex;flex-direction:column;gap:15px;align-items:center;">
    <img src="./public/icon.png" width="100" />
    <h1>Chiri</h1>
  </div>

  <p>🍃 Cross-platform CalDAV-compatible task management app.</p>

  <p>
    <a href="#download">Download</a>
    ·
    <a href="#support">Donate</a>
    ·
    <a href="#compatibility">Compatibility</a>
    ·
    <a href="#code-signing">Code signing</a>
    ·
    <a href="#license">License</a>
    ·
    <a href="#privacy">Privacy</a>
    ·
    <a href="#security">Security</a>
  </p>

  <!-- header badges start -->
  [![GitHub Repo stars][header-repo-stars-badge]][repo-stars]
  &nbsp;[![Total downloads][header-repo-total-downloads-badge]][repo-releases]
  &nbsp;[![GitHub Sponsors donation link][header-donate-github-sponsors-badge]][donate-github-sponsors]  
  &nbsp;[![Liberapay donation link][header-donate-liberapay-badge]][donate-liberapay]
  &nbsp;[![OpenCollective donation link][header-donate-opencollective-badge]][donate-opencollective]
  &nbsp;[![Patreon donation link][header-donate-patreon-badge]][donate-patreon]

  <!-- header badges end -->

  ![A screenshot of Chiri, a cross-platform CalDAV compatible task management app. The sidebar shows the "RustiCal (chloe)" account with the "Albums to listen to" calendar selected. The tasks are music albums that I plan on listening to, ranging from "Revengeseekerz by Jane Remover" and "Hearth Room by Frost Children" to "girl EDM by Ninajirachi" and "10,000 gecs by 100 gecs".][header-screenshot]
</div>

> [!IMPORTANT]  
> Though the app is functional, it is currently still in active development so you might encounter bugs here and there.  
> If you do, [file a bug report][header-repo-issues-link] and let me know.

# Download
You can download pre-built binaries of the application for each platform below.

## Windows
### Method 1: via .msi (UAC)
[<img src="./.github/assets/download/windows_msi_x64.png" width="200">][release-windows-msi-x64]
[<img src="./.github/assets/download/windows_msi_arm.png" width="200">][release-windows-msi-arm]

This method installs Chiri to the Program Files directory. Requires UAC.

---

### Method 2: via .exe (Portable)
[<img src="./.github/assets/download/windows_exe_x64.png" width="200">][release-windows-exe-x64]
[<img src="./.github/assets/download/windows_exe_arm.png" width="200">][release-windows-exe-arm]

Pick this if you don't have UAC permissions.

---

### Method 3: via Scoop
```powershell
scoop bucket add chiri https://github.com/chiriapp/chiri-scoop

scoop install chiri/chiri
```

## macOS
### Method 1: via .dmg
[<img src="./.github/assets/download/macos_dmg_applesilicon.png" width="200">][release-macos-dmg-applesilicon]
[<img src="./.github/assets/download/macos_dmg_intel.png" width="200">][release-macos-dmg-intel]

Pick the button for your Mac system architecture.

---

### Method 2: via Homebrew
```bash
brew install --cask chiri
```

---

### Method 3: via nix-darwin
#### From nixpkgs
<details>
  <summary>Use nixpkgs</summary>

```nix
# flake.nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    darwin = {
      url = "github:LnL7/nix-darwin";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };
  outputs = { darwin, ... }: {
    darwinConfigurations.your-macbook = darwin.lib.darwinSystem {
      system = "aarch64-darwin"; # Or "x86_64-darwin"
      modules = [
        ({ pkgs, ... }: {
          environment.systemPackages = [
            pkgs.chiri
          ];
        })
      ];
    };
  };
}
```
</details>

---

#### From this repo
On macOS, `default` uses the signed/notarized `bin` package to avoid woes with Gatekeeper. Use `source` to build from source.

<details>
  <summary>Track this repo</summary>

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
      url = "github:chiriapp/chiri";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };
  outputs = { darwin, chiri, ... }: {
    darwinConfigurations.your-macbook = darwin.lib.darwinSystem {
      system = "aarch64-darwin"; # Or "x86_64-darwin"
      modules = [
        ({ pkgs, ... }: {
          environment.systemPackages = [
            chiri.packages.${pkgs.system}.default
            # Or: chiri.packages.${pkgs.system}.source
          ];
        })
      ];
    };
  };
}
```
</details>

## Linux
### Debian (.deb)
[<img src="./.github/assets/download/linux_deb_x86_64.png" width="200">][release-linux-deb-x86_64]
[<img src="./.github/assets/download/linux_deb_arm.png" width="200">][release-linux-deb-arm]

---

### Fedora (.rpm)
[<img src="./.github/assets/download/linux_rpm_x86_64.png" width="200">][release-linux-rpm-x86_64]
[<img src="./.github/assets/download/linux_rpm_arm.png" width="200">][release-linux-rpm-arm]

---

### Arch Linux
Chiri is available on the AUR (Arch User Repository) in two variants:

#### Building from source
```bash
yay -S chiri
```

#### Pre-built binary
```bash
yay -S chiri-bin
```

---

### NixOS
Chiri is available from `nixpkgs`, and this repository also exposes a flake if you want to track `master`.

### From nixpkgs
```nix
environment.systemPackages = [
  pkgs.chiri
];
```

---

### From this repo
<details>
  <summary>NixOS flake example</summary>

```nix
# flake.nix
{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    chiri = {
      url = "github:chiriapp/chiri";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };
  outputs = { nixpkgs, chiri, ... }: {
    nixosConfigurations.your-hostname = nixpkgs.lib.nixosSystem {
      system = "x86_64-linux"; # Or "aarch64-linux"
      modules = [
        ({ pkgs, ... }: {
          environment.systemPackages = [
            chiri.packages.${pkgs.system}.default
            # Or: chiri.packages.${pkgs.system}.source
          ];
        })
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
      # Or: inputs.chiri.packages.${pkgs.system}.source
    ];
  }
  ```
</details>

# Support
If you found Chiri useful, please consider donating! 

I work on Chiri during my free time as a student, so every amount, however small, helps with rent and food costs. Thank you :)

<!-- donation badges start -->
[<img src="./.github/assets/donate/github-sponsors.png" width="200">][donate-github-sponsors]
[<img src="./.github/assets/donate/liberapay.png" width="200">][donate-liberapay]
[<img src="./.github/assets/donate/opencollective.png" width="200">][donate-opencollective]
[<img src="./.github/assets/donate/patreon.png" width="200">][donate-patreon]
<!-- donation badges end -->

# Compatibility
See [<span aria-hidden="true" style="user-select:none;">&nearr;</span> COMPATIBILITY.md][compatibility] for compatibility with CalDAV servers and more.

# Code signing
Free code signing on Windows is graciously provided by [<span aria-hidden="true" style="user-select:none;">&nearr;</span> SignPath.io][signpath-io], certificate by the [<span aria-hidden="true" style="user-select:none;">&nearr;</span> SignPath Foundation][signpath-foundation].

See [<span aria-hidden="true" style="user-select:none;">&nearr;</span> CODE_SIGNING.md][repo-code-signing] for the full code signing policy.

# License
Chiri is licensed under the [<span aria-hidden="true" style="user-select:none;">&nearr;</span> zlib/libpng][repo-license] license.

## Privacy
See [<span aria-hidden="true" style="user-select:none;">&nearr;</span> PRIVACY.md][repo-privacy] for details on what data Chiri processes and how.

## Security
Found a security issue? Please report it privately. See [<span aria-hidden="true" style="user-select:none;">&nearr;</span> SECURITY.md][repo-security] for details.

[compatibility]: https://github.com/chiriapp/chiri/blob/master/docs/COMPATIBILITY.md

[donate-github-sponsors]: https://github.com/sponsors/chiriapp
[donate-liberapay]: https://liberapay.com/chloe
[donate-opencollective]: https://opencollective.com/chiri
[donate-patreon]: https://www.patreon.com/c/chiriapp

[header-donate-github-sponsors-badge]: https://img.shields.io/badge/donate-github%20sponsors-f5c2e7?style=plastic&logo=githubsponsors&logoColor=f5c2e7&labelColor=18181b&cacheSeconds=10000
[header-donate-liberapay-badge]: https://img.shields.io/badge/donate-liberapay-f5c2e7?style=plastic&logo=liberapay&logoColor=f5c2e7&labelColor=18181b&cacheSeconds=10000
[header-donate-opencollective-badge]: https://img.shields.io/badge/donate-opencollective-f5c2e7?style=plastic&logo=opencollective&logoColor=f5c2e7&labelColor=18181b&cacheSeconds=10000
[header-donate-patreon-badge]: https://img.shields.io/badge/donate-patreon-f5c2e7?style=plastic&logo=patreon&logoColor=f5c2e7&labelColor=18181b&cacheSeconds=10000

[header-repo-license-badge]: https://img.shields.io/github/license/chiriapp/chiri?style=plastic&labelColor=18181b&color=f5c2e7&cacheSeconds=10000
[header-repo-stars-badge]: https://img.shields.io/github/stars/chiriapp/chiri?style=plastic&logo=github&logoColor=f5c2e7&labelColor=18181b&color=f5c2e7&cacheSeconds=10000
[header-repo-total-downloads-badge]: https://img.shields.io/github/downloads/chiriapp/chiri/total?style=plastic&logo=hack-the-box&logoColor=f5c2e7&label=downloads&labelColor=18181b&color=f5c2e7&cacheSeconds=10000

[header-repo-issues-link]: https://github.com/chiriapp/chiri/issues
[header-screenshot]: https://raw.githubusercontent.com/chiriapp/chiri/refs/heads/master/.github/assets/screenshot.png

[release-windows-msi-x64]: https://github.com/chiriapp/chiri/releases/download/app-v0.9.2/Chiri_0.9.2_x64_en-US.msi
[release-windows-msi-arm]: https://github.com/chiriapp/chiri/releases/download/app-v0.9.2/Chiri_0.9.2_arm64_en-US.msi
[release-windows-exe-x64]: https://github.com/chiriapp/chiri/releases/download/app-v0.9.2/Chiri_0.9.2_x64-setup.exe
[release-windows-exe-arm]: https://github.com/chiriapp/chiri/releases/download/app-v0.9.2/Chiri_0.9.2_arm64-setup.exe

[release-macos-dmg-applesilicon]: https://github.com/chiriapp/chiri/releases/download/app-v0.9.2/Chiri_0.9.2_aarch64.dmg
[release-macos-dmg-intel]: https://github.com/chiriapp/chiri/releases/download/app-v0.9.2/Chiri_0.9.2_x64.dmg

[release-linux-deb-x86_64]: https://github.com/chiriapp/chiri/releases/download/app-v0.9.2/Chiri_0.9.2_amd64.deb
[release-linux-deb-arm]: https://github.com/chiriapp/chiri/releases/download/app-v0.9.2/Chiri_0.9.2_arm64.deb
[release-linux-rpm-x86_64]: https://github.com/chiriapp/chiri/releases/download/app-v0.9.2/Chiri-0.9.2-1.x86_64.rpm
[release-linux-rpm-arm]: https://github.com/chiriapp/chiri/releases/download/app-v0.9.2/Chiri-0.9.2-1.aarch64.rpm

[repo-code-signing]: https://github.com/chiriapp/chiri/blob/master/docs/CODE_SIGNING.md
[repo-license]: https://github.com/chiriapp/chiri/blob/master/LICENSE
[repo-privacy]: https://github.com/chiriapp/chiri/blob/master/PRIVACY.md
[repo-releases]: https://github.com/chiriapp/chiri/releases
[repo-security]: https://github.com/chiriapp/chiri/blob/master/SECURITY.md
[repo-stars]: https://github.com/chiriapp/chiri/stargazers

[signpath-io]: https://signpath.io
[signpath-foundation]: https://signpath.org
