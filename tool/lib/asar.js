// Minimal dependency-free ASAR reader / in-memory repacker.
//
// Replaces the previous `npx --yes @electron/asar extract` + `pack` round trip, which
//   - spawned npx twice (several seconds each, and a network round trip on first use),
//   - needed a temporary directory junction for app.asar.unpacked,
//   - failed outright when offline or behind a broken proxy.
// Repacking here is a pure buffer rewrite: a 5 MB archive takes well under 100 ms.
//
// Layout (chromium-pickle):
//   u32 4 | u32 headerPickleSize | u32 payloadSize | u32 jsonLength | json | pad to 4 | file data...
// File offsets in the JSON header are decimal strings relative to the start of the data section.
'use strict';

const fs = require('fs');
const crypto = require('crypto');

const BLOCK_SIZE = 4 * 1024 * 1024;

function readHeaderFromFd(fd) {
  const head = Buffer.alloc(16);
  if (fs.readSync(fd, head, 0, 16, 0) !== 16) throw new Error('asar: file too small');
  if (head.readUInt32LE(0) !== 4) throw new Error('asar: bad magic');
  const headerPickleSize = head.readUInt32LE(4);
  const jsonLen = head.readUInt32LE(12);
  if (jsonLen <= 0 || jsonLen > 64 * 1024 * 1024 || jsonLen > headerPickleSize) {
    throw new Error('asar: implausible header size');
  }
  const jsonBuf = Buffer.alloc(jsonLen);
  fs.readSync(fd, jsonBuf, 0, jsonLen, 16);
  return { header: JSON.parse(jsonBuf.toString('utf-8')), dataOffset: 8 + headerPickleSize };
}

function findEntry(header, relPath) {
  let node = header;
  for (const part of relPath.split('/')) {
    if (!node || !node.files || !Object.prototype.hasOwnProperty.call(node.files, part)) return null;
    node = node.files[part];
  }
  return node;
}

// Reads the header (and optionally a few small files) without loading the whole archive.
function peek(asarPath, relPaths) {
  const fd = fs.openSync(asarPath, 'r');
  try {
    const { header, dataOffset } = readHeaderFromFd(fd);
    const files = {};
    for (const rel of relPaths || []) {
      const entry = findEntry(header, rel);
      if (!entry || entry.files || entry.unpacked || entry.link || entry.offset === undefined) continue;
      const buf = Buffer.alloc(entry.size);
      fs.readSync(fd, buf, 0, entry.size, dataOffset + Number(entry.offset));
      files[rel] = buf;
    }
    return { header, files };
  } finally {
    fs.closeSync(fd);
  }
}

function integrityOf(buf) {
  const blocks = [];
  for (let i = 0; i < buf.length; i += BLOCK_SIZE) {
    blocks.push(crypto.createHash('sha256').update(buf.subarray(i, Math.min(i + BLOCK_SIZE, buf.length))).digest('hex'));
  }
  if (blocks.length === 0) blocks.push(crypto.createHash('sha256').update(Buffer.alloc(0)).digest('hex'));
  return {
    algorithm: 'SHA256',
    hash: crypto.createHash('sha256').update(buf).digest('hex'),
    blockSize: BLOCK_SIZE,
    blocks
  };
}

class Asar {
  constructor(buffer) {
    if (buffer.length < 16 || buffer.readUInt32LE(0) !== 4) throw new Error('asar: bad magic');
    const headerPickleSize = buffer.readUInt32LE(4);
    const jsonLen = buffer.readUInt32LE(12);
    this.header = JSON.parse(buffer.toString('utf-8', 16, 16 + jsonLen));
    this.dataOffset = 8 + headerPickleSize;
    this.buffer = buffer;
    this.edits = new Map(); // relPath -> Buffer (replaced or newly added packed files)
  }

  static open(asarPath) {
    return new Asar(fs.readFileSync(asarPath));
  }

  has(relPath) {
    if (this.edits.has(relPath)) return true;
    const e = findEntry(this.header, relPath);
    return !!(e && !e.files && !e.link && !e.unpacked);
  }

  read(relPath) {
    if (this.edits.has(relPath)) return this.edits.get(relPath);
    const e = findEntry(this.header, relPath);
    if (!e || e.files || e.link || e.unpacked || e.offset === undefined) return null;
    const start = this.dataOffset + Number(e.offset);
    return this.buffer.subarray(start, start + e.size);
  }

  readText(relPath) {
    const b = this.read(relPath);
    return b ? b.toString('utf-8') : null;
  }

  // Replace an existing packed file or add a new one.
  write(relPath, content) {
    this.edits.set(relPath, Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf-8'));
  }

  toBuffer() {
    // Deep-clone the header so the instance stays reusable.
    const header = JSON.parse(JSON.stringify(this.header));

    // Ensure newly added files have header entries.
    for (const rel of this.edits.keys()) {
      const parts = rel.split('/');
      let node = header;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!node.files[parts[i]]) node.files[parts[i]] = { files: {} };
        node = node.files[parts[i]];
        if (!node.files) throw new Error('asar: cannot add file under non-directory ' + rel);
      }
      const leaf = parts[parts.length - 1];
      if (!node.files[leaf]) node.files[leaf] = { size: 0, offset: '0', __new: true };
      else if (node.files[leaf].files || node.files[leaf].unpacked || node.files[leaf].link) {
        throw new Error('asar: cannot overwrite non-packed entry ' + rel);
      }
    }

    // Collect packed files, keep the original on-disk order (new files go last).
    const packed = [];
    (function walk(node, prefix) {
      for (const name of Object.keys(node.files)) {
        const entry = node.files[name];
        const rel = prefix ? prefix + '/' + name : name;
        if (entry.files) walk(entry, rel);
        else if (!entry.link && !entry.unpacked && entry.offset !== undefined) packed.push({ rel, entry });
      }
    })(header, '');
    packed.sort((a, b) => {
      if (!!a.entry.__new !== !!b.entry.__new) return a.entry.__new ? 1 : -1;
      return Number(a.entry.offset) - Number(b.entry.offset);
    });

    const chunks = [];
    let cursor = 0;
    for (const { rel, entry } of packed) {
      let content;
      if (this.edits.has(rel)) {
        content = this.edits.get(rel);
        const hadIntegrity = !!entry.integrity || entry.__new;
        entry.size = content.length;
        if (hadIntegrity) entry.integrity = integrityOf(content);
      } else {
        const start = this.dataOffset + Number(entry.offset);
        content = this.buffer.subarray(start, start + entry.size);
        if (content.length !== entry.size) throw new Error('asar: truncated data for ' + rel);
      }
      delete entry.__new;
      entry.offset = String(cursor);
      cursor += content.length;
      chunks.push(content);
    }

    const json = Buffer.from(JSON.stringify(header), 'utf-8');
    const aligned = (json.length + 3) & ~3;
    const head = Buffer.alloc(16 + aligned);
    head.writeUInt32LE(4, 0);
    head.writeUInt32LE(8 + aligned, 4);   // header pickle size (payload size field + payload)
    head.writeUInt32LE(4 + aligned, 8);   // payload size (string length field + padded string)
    head.writeUInt32LE(json.length, 12);
    json.copy(head, 16);
    return Buffer.concat([head, ...chunks]);
  }
}

module.exports = { Asar, peek, findEntry };
