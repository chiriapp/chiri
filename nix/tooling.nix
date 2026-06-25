{ pkgs }:

let
  inherit (pkgs) lib;

  windowsRustTargets = [
    "aarch64-pc-windows-msvc"
  ];

  nodejs = pkgs.nodejs-slim_26;
  pnpm = pkgs.pnpm.override { nodejs-slim = nodejs; };
  llvm = pkgs.llvmPackages;
  darwinSdk = pkgs.apple-sdk_26;
  darwinSdkRoot = "${darwinSdk}/Platforms/MacOSX.platform/Developer/SDKs/MacOSX.sdk";

  darwinCcEnv = {
    CC = "${pkgs.clang.cc}/bin/clang";
    CXX = "${pkgs.clang.cc}/bin/clang++";
    CC_aarch64_apple_darwin = "${pkgs.clang.cc}/bin/clang";
    CXX_aarch64_apple_darwin = "${pkgs.clang.cc}/bin/clang++";
    CC_x86_64_apple_darwin = "${pkgs.clang.cc}/bin/clang";
    CXX_x86_64_apple_darwin = "${pkgs.clang.cc}/bin/clang++";
    CFLAGS_aarch64_apple_darwin = "-isysroot ${darwinSdkRoot}";
    CXXFLAGS_aarch64_apple_darwin = "-isysroot ${darwinSdkRoot}";
    CFLAGS_x86_64_apple_darwin = "-isysroot ${darwinSdkRoot}";
    CXXFLAGS_x86_64_apple_darwin = "-isysroot ${darwinSdkRoot}";
  };
  darwinCcExports = lib.concatStringsSep "\n" (
    lib.mapAttrsToList (name: value: "export ${name}=${lib.escapeShellArg value}") darwinCcEnv
  );

  rustToolchain = pkgs.rust-bin.stable.latest.default.override {
    extensions = [
      "rust-src"
      "rust-analyzer"
      "clippy"
    ];
    targets = windowsRustTargets;
  };

  cargoXwinRunner = pkgs.writeShellScriptBin "cargo-xwin-runner" ''
    exec ${pkgs.cargo-xwin}/bin/cargo-xwin xwin "$@"
  '';
in
{
  inherit
    cargoXwinRunner
    darwinCcExports
    darwinCcEnv
    darwinSdk
    llvm
    nodejs
    pnpm
    rustToolchain
    windowsRustTargets
    ;
}
