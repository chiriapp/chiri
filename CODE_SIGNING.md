# Code Signing Policy

This document describes how Chiri's release artifacts are signed and the policies the project follows to keep that process trustworthy.

## Free code signing provided by

[SignPath.io](https://signpath.io), certificate by the [SignPath Foundation](https://signpath.org).

## Team and roles

Chiri is currently maintained solely by Chloe ([@SapphoSys](https://github.com/SapphoSys), contact@sapphic.moe), who is responsible for all of the following SignPath roles:

- **Author** — writes and modifies source code.
- **Reviewer** — reviews changes from external contributors before they are merged.
- **Approver** — approves signing requests for release builds.

External contributions are accepted via pull request and reviewed before merging. As a solo project, in-tree changes do not have a separate reviewer; this is documented here for transparency.

If additional maintainers join the project, this document will be updated to reflect their identities and assigned roles before any signing privileges are extended to them.

## Privacy policy

See [PRIVACY.md](./PRIVACY.md) for details on what data Chiri processes and how.

## Signing process

- Signing happens automatically in Chiri's GitHub Actions release workflow when a new release is tagged.
- Source builds are produced from the `chiriapp/chiri` repository on GitHub. Signed binaries are never uploaded from a developer machine.
- Each signed binary has its product name and version metadata set, in line with SignPath Foundation requirements.
- Build scripts and CI workflows are kept in the public repository and are auditable.

## Account security

- The maintainer's GitHub account uses two-factor authentication.
- The maintainer's SignPath account uses multi-factor authentication.
- The `chiriapp` GitHub organization requires two-factor authentication for all members.

## Reporting concerns

If you believe a Chiri release has been signed inappropriately, please contact contact@sapphic.moe.

For security vulnerabilities in the project itself, see [SECURITY.md](./SECURITY.md).

## Attribution

This project's Windows release binaries are signed using a certificate provided free of charge by the [SignPath Foundation](https://signpath.org), through the [SignPath.io](https://signpath.io) signing service.
