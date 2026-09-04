// Off-box backup copies.
//
// Backups were written next to the database on the same disk, so the copy and
// the original shared a single failure. These cover the signing (which cannot
// be checked against a live bucket here) and the switch that keeps the feature
// off until it is configured.

import test from 'node:test'
import assert from 'node:assert/strict'
import offsiteMod from '../server/backup-offsite.cjs'

const { createOffsiteBackup, signPut, deriveSigningKey } = offsiteMod

const CREDS = {
  accessKeyId: 'AKIDEXAMPLE',
  secretAccessKey: 'wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY',
}

const FIXTURE = {
  endpoint: 'https://examplebucket.s3.amazonaws.com',
  region: 'us-east-1',
  bucket: 'kingdom-backups',
  key: 'kingdom846/k846-2026-09-04.db',
  body: Buffer.from('hello kingdom'),
  now: new Date('2026-09-04T12:00:00Z'),
  ...CREDS,
}

// Checked against the `aws4` package signing the identical request. A change
// here means the signature changed, and every upload would start failing with
// SignatureDoesNotMatch -- which object storage reports as a bare 403.
test('the signature matches a reference SigV4 implementation', () => {
  const { headers } = signPut(FIXTURE)
  const signature = headers.Authorization.match(/Signature=([a-f0-9]+)/)[1]
  assert.equal(signature, 'fe1d60cc8ce6380286e9f56be297db26ff8e683b806f0e550d4a9966d102f1ec')
})

test('the credential scope names the date, region and service', () => {
  const { headers } = signPut(FIXTURE)
  assert.match(headers.Authorization, /Credential=AKIDEXAMPLE\/20260904\/us-east-1\/s3\/aws4_request/)
})

test('content-length is signed, not merely sent', () => {
  const { headers } = signPut(FIXTURE)
  assert.match(headers.Authorization, /SignedHeaders=content-length;content-type;host;x-amz-content-sha256;x-amz-date/)
  assert.equal(headers['content-length'], '13')
})

test('the payload hash covers the body', () => {
  const a = signPut(FIXTURE)
  const b = signPut({ ...FIXTURE, body: Buffer.from('different bytes') })
  assert.notEqual(a.headers['x-amz-content-sha256'], b.headers['x-amz-content-sha256'])
})

// An empty bucket used to build "<endpoint>//<key>", and the extra slash is
// part of the canonical request -- so every signature was wrong in a way that
// only showed up as a 403 from the bucket.
test('an empty bucket is refused rather than signed wrongly', () => {
  assert.throws(() => signPut({ ...FIXTURE, bucket: '' }), /bucket is required/)
})

test('key segments are percent-encoded, path separators are not', () => {
  const { url } = signPut({ ...FIXTURE, key: 'kingdom 846/k846 backup.db' })
  assert.match(url, /kingdom%20846\/k846%20backup\.db$/)
  assert.match(url, /\/kingdom-backups\//)
})

test('the signing key derivation is the four-step SigV4 chain', () => {
  const key = deriveSigningKey(CREDS.secretAccessKey, '20260904', 'us-east-1', 's3')
  assert.equal(key.length, 32)
  // Same inputs, same key; a different date must produce a different one.
  assert.deepEqual(key, deriveSigningKey(CREDS.secretAccessKey, '20260904', 'us-east-1', 's3'))
  assert.notDeepEqual(key, deriveSigningKey(CREDS.secretAccessKey, '20260905', 'us-east-1', 's3'))
})

// The feature must stay off until all four settings are present: a half
// configured uploader that throws on every backup is worse than none.
test('off unless endpoint, bucket, key and secret are all set', () => {
  assert.equal(createOffsiteBackup({}), null)
  assert.equal(createOffsiteBackup({ BACKUP_S3_ENDPOINT: 'https://x' }), null)
  assert.equal(createOffsiteBackup({
    BACKUP_S3_ENDPOINT: 'https://x', BACKUP_S3_BUCKET: 'b', BACKUP_S3_KEY: 'k',
  }), null)

  const on = createOffsiteBackup({
    BACKUP_S3_ENDPOINT: 'https://x', BACKUP_S3_BUCKET: 'b',
    BACKUP_S3_KEY: 'k', BACKUP_S3_SECRET: 's',
  })
  assert.ok(on)
  assert.equal(on.bucket, 'b')
  assert.equal(on.region, 'auto')
  assert.equal(on.prefix, 'kingdom846')
})

test('a failed upload reports the status and body', async () => {
  const fake = async () => ({ ok: false, status: 403, text: async () => 'SignatureDoesNotMatch' })
  const uploader = createOffsiteBackup({
    BACKUP_S3_ENDPOINT: 'https://x', BACKUP_S3_BUCKET: 'b',
    BACKUP_S3_KEY: 'k', BACKUP_S3_SECRET: 's',
  }, fake)
  await assert.rejects(() => uploader.upload('package.json'), /403.*SignatureDoesNotMatch/)
})

test('a successful upload reports the key and byte count', async () => {
  let seen = null
  const fake = async (url, init) => { seen = { url, init }; return { ok: true, status: 200 } }
  const uploader = createOffsiteBackup({
    BACKUP_S3_ENDPOINT: 'https://x', BACKUP_S3_BUCKET: 'b',
    BACKUP_S3_KEY: 'k', BACKUP_S3_SECRET: 's', BACKUP_S3_PREFIX: 'realm',
  }, fake)

  const out = await uploader.upload('package.json')
  assert.equal(out.key, 'realm/package.json')
  assert.ok(out.bytes > 0)
  assert.equal(seen.init.method, 'PUT')
  assert.match(seen.url, /^https:\/\/x\/b\/realm\/package\.json$/)
})
