# Release And Updates

zTerm publishes desktop installers and updater metadata through GitHub Releases.
Release builds keep the existing `electron-vite` bundle step and use
`electron-builder` for platform packaging.

## Local Packaging

```bash
npm run lint
npm run typecheck
npm run build
npm run pack
npm run dist
```

- `npm run pack` creates an unpacked app for the current platform.
- `npm run dist` creates distributable artifacts for the current platform.
- `npm run release` publishes artifacts when `GH_TOKEN` is available and the
  current Git ref is a release tag.

Artifacts are written to `release/`.

## Branding Assets

The first release can use Electron's default generated app icon for internal
validation. Before public distribution, add branded assets under `resources/`
and point the `build` configuration in `package.json` at them:

- `resources/icon.icns` for macOS.
- `resources/icon.ico` for Windows.
- `resources/icons/*.png` for Linux desktop entries.
- Optional NSIS installer artwork such as sidebar and header bitmaps.
- Optional DMG background artwork.

Keep source artwork outside signed secrets; icon and installer images are safe
to commit.

## GitHub Tag Release

1. Update `package.json` to the release version.
2. Run `npm run lint`, `npm run typecheck`, and `npm run build`.
3. Commit the version change.
4. Create and push a matching tag, for example `v0.1.0`.
5. The release workflow validates that the tag version matches
   `package.json`, packages each platform, and uploads installers plus updater
   metadata to the matching GitHub Release.

Packaged clients discover updates from the configured GitHub Releases provider
for `leonfox28/zTerm`.

## Signing And Notarization

No signing credential should be committed to the repository. Configure signing
through GitHub repository secrets when public releases are ready.

Common secrets:

- `CSC_LINK`: base64 encoded signing certificate or a secure URL supported by
  `electron-builder`.
- `CSC_KEY_PASSWORD`: signing certificate password.
- `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`: macOS
  notarization credentials.

When these secrets are absent, CI can still produce unsigned artifacts for
internal validation. Unsigned macOS and Windows builds may show Gatekeeper or
SmartScreen warnings and should not be treated as polished public installers.

## End-User Update Behavior

- Packaged zTerm checks for updates once after the main window is ready.
- Development mode never performs a real updater network check and reports
  updates as unavailable.
- Settings exposes an `Updates` category with the current version, updater
  status, manual check action, download progress, and restart/install action.
- zTerm asks before downloading an available update.
- After download, zTerm asks again before restarting to install so active
  terminal sessions are not interrupted without confirmation.
- Update errors are non-blocking; terminal, SSH, and Explorer workflows remain
  usable.
