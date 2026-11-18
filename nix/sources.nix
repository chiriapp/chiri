{
  lib,
  src,
}:

let
  sourceRoot = builtins.toString src;

  appFiles = [
    "index.html"
    "package.json"
    "pnpm-lock.yaml"
    "pnpm-workspace.yaml"
    "tsconfig.json"
    "tsconfig.node.json"
    "vite.config.ts"
    # type-checked by tsc (which includes src/tests) to validate mock aliases
    "vitest.config.ts"
  ];

  appDirs = [
    "public"
    "src"
    "src-tauri"
  ];

  excludedPaths = [
    "src-tauri/target"
  ];

  excludedPrefixes = [
    "src-tauri/target/"
  ];

  app = lib.cleanSourceWith {
    inherit src;

    filter =
      path: _type:
      let
        relPath = lib.removePrefix "${sourceRoot}/" (builtins.toString path);
      in
      (
        builtins.elem relPath appFiles
        || builtins.elem relPath appDirs
        || lib.any (dir: lib.hasPrefix "${dir}/" relPath) appDirs
      )
      && !(lib.hasSuffix "/.DS_Store" relPath)
      && !(builtins.elem relPath excludedPaths)
      && !(lib.any (prefix: lib.hasPrefix prefix relPath) excludedPrefixes);
  };
in
{
  inherit app;
}
