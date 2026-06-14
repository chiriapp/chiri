{
  description = "🍃 Chiri - a cross-platform CalDAV task management app.";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    rust-overlay = {
      url = "github:oxalica/rust-overlay";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    {
      nixpkgs,
      rust-overlay,
      ...
    }:
    let
      lib = nixpkgs.lib;

      systems = [
        "aarch64-darwin"
        "aarch64-linux"
        "x86_64-darwin"
        "x86_64-linux"
      ];

      pkgsFor =
        system:
        import nixpkgs {
          inherit system;
          overlays = [ (import rust-overlay) ];
        };

      perSystem =
        pkgs:
        let
          caldavServers = import ./nix/apps/caldav-servers { inherit pkgs; };
        in
        {
          packages =
            import ./nix/packages {
              inherit pkgs;
              src = ./.;
            }
            // caldavServers.packages;

          apps = caldavServers.apps;

          devShells = {
            default = import ./nix/shell.nix { inherit pkgs; };
          };

          formatter = pkgs.nixfmt;
        };

      systemOutputs = lib.genAttrs systems (system: perSystem (pkgsFor system));
      selectOutput = name: lib.mapAttrs (_: output: output.${name}) systemOutputs;
    in
    {
      packages = selectOutput "packages";
      apps = selectOutput "apps";
      devShells = selectOutput "devShells";
      formatter = selectOutput "formatter";
    };
}
