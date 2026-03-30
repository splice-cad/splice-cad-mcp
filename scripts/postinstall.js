#!/usr/bin/env node

/**
 * Postinstall script that downloads the splice-bridge binary for the current platform.
 * The binary is placed in node_modules/.splice-bridge/ and used by the MCP server
 * to auto-launch the bridge when needed.
 */

import { createWriteStream, mkdirSync, chmodSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { pipeline } from 'stream/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BRIDGE_VERSION = 'v0.1.0';
const REPO = 'splice-cad/splice-bridge';
const BASE_URL = `https://github.com/${REPO}/releases/download/${BRIDGE_VERSION}`;

function getPlatformTarget() {
  const platform = process.platform;
  const arch = process.arch;

  if (platform === 'darwin' && arch === 'arm64') return 'aarch64-apple-darwin';
  if (platform === 'darwin' && arch === 'x64') return 'x86_64-apple-darwin';
  if (platform === 'linux' && arch === 'x64') return 'x86_64-unknown-linux-gnu';
  if (platform === 'win32' && arch === 'x64') return 'x86_64-pc-windows-msvc';

  console.warn(`[splice-bridge] No prebuilt binary for ${platform}-${arch}. Multi-agent mode requires manual installation.`);
  console.warn(`[splice-bridge] See https://github.com/${REPO} for build instructions.`);
  return null;
}

async function download(url, dest) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  const fileStream = createWriteStream(dest);
  await pipeline(res.body, fileStream);
}

async function main() {
  const target = getPlatformTarget();
  if (!target) return;

  const isWindows = process.platform === 'win32';
  const archiveExt = isWindows ? '.zip' : '.tar.gz';
  const binaryName = isWindows ? 'splice-bridge.exe' : 'splice-bridge';

  const binDir = join(__dirname, '..', 'bin');
  const archivePath = join(binDir, `splice-bridge${archiveExt}`);
  const binaryPath = join(binDir, binaryName);

  // Skip if binary already exists
  if (existsSync(binaryPath)) {
    console.log(`[splice-bridge] Binary already exists at ${binaryPath}`);
    return;
  }

  mkdirSync(binDir, { recursive: true });

  const url = `${BASE_URL}/splice-bridge-${target}${archiveExt}`;
  console.log(`[splice-bridge] Downloading ${target} binary...`);

  try {
    await download(url, archivePath);

    // Extract
    if (isWindows) {
      execSync(`tar -xf "${archivePath}" -C "${binDir}"`, { stdio: 'pipe' });
    } else {
      execSync(`tar xzf "${archivePath}" -C "${binDir}"`, { stdio: 'pipe' });
      chmodSync(binaryPath, 0o755);
    }

    // Clean up archive
    const { unlinkSync } = await import('fs');
    unlinkSync(archivePath);

    console.log(`[splice-bridge] Installed to ${binaryPath}`);
  } catch (err) {
    console.warn(`[splice-bridge] Failed to download binary: ${err.message}`);
    console.warn(`[splice-bridge] Single-agent mode will still work. Multi-agent mode requires manual installation.`);
    console.warn(`[splice-bridge] See https://github.com/${REPO}`);
  }
}

main();
