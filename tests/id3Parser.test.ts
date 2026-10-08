import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAudioMetadata } from '../src/utils/id3Parser';

test('parseAudioMetadata returns empty object for empty or non-audio buffer', async () => {
  const dummyBlob = new Blob([new Uint8Array([0, 1, 2, 3])]);
  const meta = await parseAudioMetadata(dummyBlob);
  assert.deepEqual(meta, {});
});

test('parseAudioMetadata parses ID3v2.3 APIC and TIT2 tags correctly', async () => {
  // Construct a minimal ID3v2.3 buffer with TIT2 and APIC
  // Header: "ID3" + version 3 + revision 0 + flags 0 + size (synchsafe)
  // Dummy 4-byte JPEG image: 0xFF, 0xD8, 0xFF, 0xE0
  const fakeJpeg = [0xff, 0xd8, 0xff, 0xe0];
  
  // APIC frame:
  // frame ID: 'APIC' (4)
  // frame size: 4 bytes big endian
  // flags: 2 bytes (0, 0)
  // encoding: 1 byte (0 = ISO-8859-1)
  // mime: "image/jpeg" + 0
  // pictureType: 3 (cover front)
  // desc: 0 (empty string)
  // data: fakeJpeg
  const mimeBytes = [0x69, 0x6d, 0x61, 0x67, 0x65, 0x2f, 0x6a, 0x70, 0x65, 0x67, 0x00];
  const apicPayload = [0x00, ...mimeBytes, 0x03, 0x00, ...fakeJpeg];
  const apicFrame = [
    0x41, 0x50, 0x49, 0x43, // 'APIC'
    0, 0, 0, apicPayload.length, // size
    0, 0, // flags
    ...apicPayload
  ];

  // TIT2 frame:
  // payload: encoding 0 + "Song Title"
  const titleText = [0x53, 0x6f, 0x6e, 0x67, 0x20, 0x54, 0x69, 0x74, 0x6c, 0x65];
  const tit2Payload = [0x00, ...titleText];
  const tit2Frame = [
    0x54, 0x49, 0x54, 0x32, // 'TIT2'
    0, 0, 0, tit2Payload.length,
    0, 0,
    ...tit2Payload
  ];

  const allFrames = [...tit2Frame, ...apicFrame];
  const tagSize = allFrames.length;
  // Synchsafe integer conversion for tagSize
  const b0 = (tagSize >> 21) & 0x7f;
  const b1 = (tagSize >> 14) & 0x7f;
  const b2 = (tagSize >> 7) & 0x7f;
  const b3 = tagSize & 0x7f;

  const header = [0x49, 0x44, 0x33, 0x03, 0x00, 0x00, b0, b1, b2, b3];
  const fileBytes = new Uint8Array([...header, ...allFrames]);
  const blob = new Blob([fileBytes]);

  const meta = await parseAudioMetadata(blob);
  assert.equal(meta.title, 'Song Title');
  assert.ok(meta.coverUrl?.startsWith('data:image/jpeg;base64,'));
});
