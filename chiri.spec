# rust release profile strips symbols, so there is no debuginfo to package
%global debug_package %{nil}

Name:           chiri
Version:        0.9.2
Release:        1%{?dist}
Summary:        Sync and manage tasks across CalDAV servers

License:        zlib
URL:            https://github.com/chiriapp/chiri
# Source0 is the git checkout itself, Source1 the vendored cargo crates,
# Source2 the prebuilt frontend — all produced by scripts/make-srpm.sh,
# which also syncs Version: above from src-tauri/tauri.conf.json.
Source0:        chiri-%{version}.tar.gz
Source1:        chiri-%{version}-vendor.tar.gz
Source2:        chiri-%{version}-frontend.tar.gz

BuildRequires:  cargo
BuildRequires:  gcc
BuildRequires:  pkg-config
BuildRequires:  desktop-file-utils
BuildRequires:  webkit2gtk4.1-devel
BuildRequires:  libsoup3-devel
BuildRequires:  gtk3-devel
BuildRequires:  libayatana-appindicator-gtk3-devel
BuildRequires:  openssl-devel

# dlopened via GIO modules / bare soname at runtime, so rpm auto-requires
# will not catch these
Requires:       libayatana-appindicator-gtk3
Requires:       glib-networking
Requires:       hicolor-icon-theme

%description
Chiri is a desktop task manager that syncs tasks across CalDAV servers
such as Nextcloud, Fastmail, and Xandikos.

%prep
%autosetup -n chiri-%{version}
tar xzf %{SOURCE1}
tar xzf %{SOURCE2}
mkdir -p .cargo
cat > .cargo/config.toml <<EOF
[source.crates-io]
replace-with = "vendored-sources"

[source.vendored-sources]
directory = "%{_builddir}/chiri-%{version}/vendor"
EOF

%build
# thin LTO + parallel codegen for Copr builds; the fat-LTO reference
# binaries come from tauri CI (see [profile.release] in src-tauri/Cargo.toml)
cd src-tauri
cargo build --release --locked --features custom-protocol \
    --config 'profile.release.lto="thin"' \
    --config 'profile.release.codegen-units=16'

%install
install -Dm0755 src-tauri/target/release/Chiri %{buildroot}%{_bindir}/chiri

sed -e 's|{{{comment}}}|Sync and manage tasks across CalDAV servers|' \
    -e 's|{{{exec}}}|chiri|' \
    -e 's|{{{icon}}}|garden.chiri.Chiri|' \
    -e 's|{{{categories}}}|Utility;|' \
    src-tauri/linux/garden.chiri.Chiri.desktop > garden.chiri.Chiri.desktop
install -Dm0644 garden.chiri.Chiri.desktop %{buildroot}%{_datadir}/applications/garden.chiri.Chiri.desktop

for size in 32 64 128; do
    install -Dm0644 src-tauri/icons/${size}x${size}.png \
        %{buildroot}%{_datadir}/icons/hicolor/${size}x${size}/apps/garden.chiri.Chiri.png
done
install -Dm0644 src-tauri/icons/128x128@2x.png \
    %{buildroot}%{_datadir}/icons/hicolor/256x256/apps/garden.chiri.Chiri.png
install -Dm0644 src-tauri/icons/icon.png \
    %{buildroot}%{_datadir}/icons/hicolor/512x512/apps/garden.chiri.Chiri.png

# marker so the app knows updates are managed by the package manager
install -dm0755 %{buildroot}%{_datadir}/chiri
touch %{buildroot}%{_datadir}/chiri/.copr-install

%check
desktop-file-validate %{buildroot}%{_datadir}/applications/garden.chiri.Chiri.desktop

%files
%license LICENSE
%doc README.md
%{_bindir}/chiri
%{_datadir}/applications/garden.chiri.Chiri.desktop
%{_datadir}/icons/hicolor/*/apps/garden.chiri.Chiri.png
%{_datadir}/chiri/

%changelog
* Sun Jul 19 2026 Sapphic Angels - 0.9.2-1
- Initial Copr build
