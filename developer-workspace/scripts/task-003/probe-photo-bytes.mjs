// Task 10 — what exactly would we upload?
//
// `auto=format` alone returns whatever a no-Accept client is offered (a 2 MB PNG
// for one photo). This compares the plain URL against one that forces JPEG, and
// lists the JPEG segments so "EXIF stripped at the write boundary" (specs/media)
// is decided on bytes rather than assumed.
//
//   node developer-workspace/scripts/task-003/probe-photo-bytes.mjs

const SAMPLES = [
  ["TS-1011 p1 (the PNG)", "1605556816125-d752c226247b"],
  ["TS-1001 p0", "1621007947382-bb3c3994e3fb"],
  ["TS-1005 p2", "1696294586764-6baffd088b71"],
  ["TS-1025 p0", "1552519507-da3b142c6e3d"],
];

// JPEG marker names for the segment scan.
const MARKERS = {
  0xe0: "APP0/JFIF",
  0xe1: "APP1/Exif",
  0xe2: "APP2/ICC",
  0xed: "APP13/IPTC",
  0xee: "APP14/Adobe",
  0xdb: "DQT",
  0xc0: "SOF0",
  0xc2: "SOF2",
  0xc4: "DHT",
  0xda: "SOS",
  0xd9: "EOI",
};

function segments(bytes) {
  const out = [];
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return ["(not a JPEG)"];
  let i = 2;
  while (i < bytes.length - 1) {
    if (bytes[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = bytes[i + 1];
    if (marker === 0xda || marker === 0xd9) {
      out.push(MARKERS[marker] ?? `0x${marker.toString(16)}`);
      break;
    }
    const len = bytes.readUInt16BE(i + 2);
    const name = MARKERS[marker] ?? `0x${marker.toString(16)}`;
    // Exif payload often sits right after the marker: "Exif\0\0"
    const head = bytes.subarray(i + 4, i + 4 + 6).toString("latin1");
    out.push(`${name}(${len}${head.startsWith("Exif") ? " Exif!" : ""})`);
    i += 2 + len;
  }
  return out;
}

for (const [label, id] of SAMPLES) {
  for (const [how, tail] of [
    ["auto=format      ", "auto=format&fit=crop&w=1200&q=70"],
    ["auto=format&fm=jpg", "auto=format&fit=crop&w=1200&q=70&fm=jpg"],
  ]) {
    const url = `https://images.unsplash.com/photo-${id}?${tail}`;
    const res = await fetch(url);
    const buf = Buffer.from(await res.arrayBuffer());
    const type = res.headers.get("content-type");
    const segs = type === "image/jpeg" ? segments(buf).join(" ") : "(n/a)";
    console.log(
      `${label}  ${how}  ${res.status} ${type} ${(buf.length / 1024).toFixed(0)}KB\n    segments: ${segs}`,
    );
  }
  console.log();
}
