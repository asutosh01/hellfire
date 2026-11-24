# Troubleshooting

Common issues, diagnostics, and recovery steps.

## Diagnostic Check

Run the test suite to verify all browser subsystems:

```bash
cd standalone
npm test
```

All 10 test suites (210 assertions) should pass.

## Common Issues

### Browser does not open when clicking the shortcut
- **Running in background:** Hell Fire uses a single-instance lock (`app.requestSingleInstanceLock()`). If a background process didn't terminate cleanly, new launches will focus the existing hidden window. Open Windows Task Manager (`Ctrl+Shift+Escape`), end any lingering `electron.exe` or `Hell Fire.exe` processes, and reopen.
- **Stale shortcut path:** If you moved the repository, the shortcut may point to an old directory. Launch using `Launch Hell Fire.bat` in the root or run `npm start` inside `standalone/`.

### Access Denied (0x5) / Cache Lock Error
Occurs when two processes attempt to lock the same user cache directory simultaneously. Close any orphaned processes in Windows Task Manager.

### Password vault resets or appears empty
`standalone/data/vault.enc` is encrypted using Windows DPAPI, which ties the decryption key to the specific Windows user profile. If you copy `vault.enc` to a different machine, user account, or if the file was corrupted, the vault loader safely resets to an empty array to prevent startup failure.

### DNS queries fail on specific networks
Some corporate networks and public Wi-Fi block UDP/TCP port 443 DoH requests to specific providers. Open Settings (`Ctrl+,`) and switch the DNS provider between Cloudflare, Quad9, and Mullvad.
