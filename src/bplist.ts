// Minimal binary plist encoder (bplist00 format)
// No npm dependencies — compatible with Cloudflare Workers

type PVal = null | boolean | number | string | Uint8Array | PVal[] | { [k: string]: PVal }

export function encodeBplist(root: PVal): Uint8Array {
  // ── Phase 1: flatten object graph into indexed array ──
  type Node =
    | { k: 'null' }
    | { k: 'bool'; v: boolean }
    | { k: 'int'; v: number }
    | { k: 'real'; v: number }
    | { k: 'str'; v: string }
    | { k: 'data'; v: Uint8Array }
    | { k: 'arr'; c: number[] }
    | { k: 'dict'; ks: number[]; vs: number[] }

  const nodes: Node[] = []

  function collect(v: PVal): number {
    const idx = nodes.length
    nodes.push({ k: 'null' }) // placeholder

    if (v === null || v === undefined) {
      nodes[idx] = { k: 'null' }
    } else if (typeof v === 'boolean') {
      nodes[idx] = { k: 'bool', v }
    } else if (typeof v === 'number') {
      nodes[idx] = Number.isInteger(v) ? { k: 'int', v } : { k: 'real', v }
    } else if (typeof v === 'string') {
      nodes[idx] = { k: 'str', v }
    } else if (v instanceof Uint8Array) {
      nodes[idx] = { k: 'data', v }
    } else if (Array.isArray(v)) {
      const c = v.map(i => collect(i))
      nodes[idx] = { k: 'arr', c }
    } else {
      const keys = Object.keys(v)
      const ks = keys.map(k => collect(k))
      const vs = keys.map(k => collect((v as any)[k]))
      nodes[idx] = { k: 'dict', ks, vs }
    }
    return idx
  }

  collect(root)
  const n = nodes.length
  const refSize = n <= 0xff ? 1 : n <= 0xffff ? 2 : 4

  // ── Phase 2: encode each node, track byte offsets ──
  const bufs: number[][] = []
  const offsets: number[] = []
  let pos = 8 // after magic header

  function pushInt(buf: number[], v: number) {
    if (v < 0x100) {
      buf.push(0x10, v)
    } else if (v < 0x10000) {
      buf.push(0x11, (v >> 8) & 0xff, v & 0xff)
    } else {
      buf.push(0x12, (v >> 24) & 0xff, (v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff)
    }
  }

  function pushLen(buf: number[], base: number, len: number) {
    if (len < 15) {
      buf.push(base | len)
    } else {
      buf.push(base | 0xf)
      pushInt(buf, len)
    }
  }

  function pushRef(buf: number[], ref: number) {
    if (refSize === 1) buf.push(ref & 0xff)
    else buf.push((ref >> 8) & 0xff, ref & 0xff)
  }

  for (let i = 0; i < n; i++) {
    offsets.push(pos)
    const buf: number[] = []
    const node = nodes[i]

    switch (node.k) {
      case 'null':  buf.push(0x00); break
      case 'bool':  buf.push(node.v ? 0x09 : 0x08); break
      case 'int':   pushInt(buf, node.v); break
      case 'real': {
        buf.push(0x23)
        const ab = new ArrayBuffer(8)
        new DataView(ab).setFloat64(0, node.v, false)
        new Uint8Array(ab).forEach(b => buf.push(b))
        break
      }
      case 'str': {
        const s = node.v
        // Check if pure ASCII
        let ascii = true
        for (let j = 0; j < s.length; j++) if (s.charCodeAt(j) > 0x7f) { ascii = false; break }
        if (ascii) {
          pushLen(buf, 0x50, s.length)
          for (let j = 0; j < s.length; j++) buf.push(s.charCodeAt(j))
        } else {
          pushLen(buf, 0x60, s.length) // length in UTF-16 code units
          for (let j = 0; j < s.length; j++) {
            const c = s.charCodeAt(j)
            buf.push((c >> 8) & 0xff, c & 0xff)
          }
        }
        break
      }
      case 'data':
        pushLen(buf, 0x40, node.v.length)
        node.v.forEach(b => buf.push(b))
        break
      case 'arr':
        pushLen(buf, 0xa0, node.c.length)
        node.c.forEach(r => pushRef(buf, r))
        break
      case 'dict':
        pushLen(buf, 0xd0, node.ks.length)
        node.ks.forEach(r => pushRef(buf, r))
        node.vs.forEach(r => pushRef(buf, r))
        break
    }

    bufs.push(buf)
    pos += buf.length
  }

  // ── Phase 3: offset table ──
  const offTableOffset = pos
  const offSize = offTableOffset <= 0xff ? 1 : offTableOffset <= 0xffff ? 2 : offTableOffset <= 0xffffff ? 3 : 4

  // ── Assemble output ──
  // magic(8) + objects + offsets(n*offSize) + trailer(32)
  const objBytes = bufs.reduce((s, b) => s + b.length, 0)
  const totalSize = 8 + objBytes + n * offSize + 32
  const out = new Uint8Array(totalSize)
  const dv = new DataView(out.buffer)

  // magic
  const magic = [0x62, 0x70, 0x6c, 0x69, 0x73, 0x74, 0x30, 0x30]
  magic.forEach((b, i) => out[i] = b)

  // objects
  let cursor = 8
  for (const buf of bufs) {
    buf.forEach(b => { out[cursor++] = b })
  }

  // offset table
  for (const off of offsets) {
    if (offSize === 1) out[cursor++] = off
    else if (offSize === 2) { out[cursor++] = (off >> 8) & 0xff; out[cursor++] = off & 0xff }
    else if (offSize === 3) { out[cursor++] = (off >> 16) & 0xff; out[cursor++] = (off >> 8) & 0xff; out[cursor++] = off & 0xff }
    else { dv.setUint32(cursor, off, false); cursor += 4 }
  }

  // trailer (32 bytes): 6 unused + sort(1) + offSize(1) + refSize(1) + nObj(8) + topObj(8) + offTableOff(8)
  cursor += 6 // padding already zero
  out[cursor++] = 0 // sort version
  out[cursor++] = offSize
  out[cursor++] = refSize
  dv.setBigUint64(cursor, BigInt(n), false); cursor += 8
  dv.setBigUint64(cursor, BigInt(0), false); cursor += 8 // top object = index 0
  dv.setBigUint64(cursor, BigInt(offTableOffset), false)

  return out
}
