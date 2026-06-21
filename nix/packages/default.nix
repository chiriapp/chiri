{
  pkgs,
  src,
}:

let
  tooling = import ../tooling.nix { inherit pkgs; };
  rustPlatform = pkgs.makeRustPlatform {
    cargo = tooling.rustToolchain;
    rustc = tooling.rustToolchain;
  };
  source = pkgs.callPackage ./source.nix {
    inherit src rustPlatform;
    inherit (tooling) darwinCcEnv darwinCcExports nodejs pnpm rustToolchain;
  };
  bin = pkgs.callPackage ./binary.nix { };
in
{
  # on macOS, default to the signed/notarized release artifact to avoid
  # gatekeeper surprises. users can use .#source to build the current checkout
  default = if pkgs.stdenv.hostPlatform.isDarwin then bin else source;
  inherit source bin;
}
