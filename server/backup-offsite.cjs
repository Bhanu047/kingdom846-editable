// Copying the backups off the box.
//
// Backups were written to BACKUP_DIR, which defaults to a folder beside the
// database on the same Render disk. That protects against a bad write, a bad
// migration, or someone deleting the wrong row -- but not against losing the
// disk, which is the failure that ends the kingdom. The copy and the original
// died together.
//
// This uploads each finished backup to S3-compatible object storage. It speaks
// the protocol directly rather than pulling in an SDK: the whole job is one
// signed PUT, and an AWS SDK is a large dependency to carry for that.
//
// It is OFF unless all four of BACKUP_S3_ENDPOINT, BACKUP_S3_BUCKET,
// BACKUP_S3_KEY and BACKUP_S3_SECRET are set. When off, createOffsiteBackup
// returns null and nothing about the existing local backups changes.

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const ALGORITHM = 'AWS4-HMAC-SHA256'
const SERVICE = 's3'
const TIMEOUT_MS = 120000

const sha256Hex = (data) => crypto.createHash('sha256').update(data).digest('hex')
const hmac = (key, data) => crypto.createHmac('sha256', key).update(data).digest()

/**
 * The four-step key derivation from the SigV4 specification. Published test
 * vectors exist for exactly this function, which is why it is separated out.
 */
function deriveSigningKey(secretAccessKey, dateStamp, region, service = SERVICE) {
  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp)
  const kRegion = hmac(kDate, region)
  const kService = hmac(kRegion, service)
  return hmac(kService, 'aws4_request')
}

/** Percent-encode a key for a URI path, leaving the separators alone. */
const encodeKey = (key) =>
  key.split('/').map((segment) => encodeURIComponent(segment)).join('/')

/**
 * Sign a PUT and return the headers for it. Split from the request itself so
 * the signing can be tested without a network or credentials.
 */
function signPut({ endpoint, region, bucket, key, accessKeyId, secretAccessKey, body, now = new Date(), contentType = 'application/octet-stream' }) {
  // Path-style addressing: <endpoint>/<bucket>/<key>. R2, B2, MinIO and Wasabi
  // all accept it, and it avoids having to build a virtual-host name per
  // provider. An empty bucket would produce a double slash, which changes the
  // canonical request and silently breaks every signature.
  if (!bucket) throw new Error('signPut: bucket is required')
  const url = new URL(`${endpoint.replace(/\/+$/, '')}/${bucket}/${encodeKey(key)}`)
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const dateStamp = amzDate.slice(0, 8)
  const payloadHash = sha256Hex(body)

  // content-length is signed, not merely sent: signing it means the length
  // cannot be altered in flight without invalidating the signature.
  const headers = {
    host: url.host,
    'content-length': String(Buffer.byteLength(body)),
    'content-type': contentType,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  }
  const signedHeaders = Object.keys(headers).sort().join(';')
  const canonicalHeaders = Object.keys(headers).sort()
    .map((h) => `${h}:${String(headers[h]).trim()}\n`).join('')

  const canonicalRequest = [
    'PUT',
    url.pathname,
    '', // no query string
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n')

  const scope = `${dateStamp}/${region}/${SERVICE}/aws4_request`
  const stringToSign = [ALGORITHM, amzDate, scope, sha256Hex(canonicalRequest)].join('\n')
  const signature = crypto
    .createHmac('sha256', deriveSigningKey(secretAccessKey, dateStamp, region))
    .update(stringToSign)
    .digest('hex')

  return {
    url: url.toString(),
    headers: {
      ...headers,
      Authorization: `${ALGORITHM} Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
    canonicalRequest,
    stringToSign,
  }
}

function createOffsiteBackup(env = process.env, fetchImpl = globalThis.fetch) {
  const endpoint = env.BACKUP_S3_ENDPOINT
  const bucket = env.BACKUP_S3_BUCKET
  const accessKeyId = env.BACKUP_S3_KEY
  const secretAccessKey = env.BACKUP_S3_SECRET
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null

  const region = env.BACKUP_S3_REGION || 'auto'
  const prefix = (env.BACKUP_S3_PREFIX || 'kingdom846').replace(/^\/+|\/+$/g, '')

  async function upload(localPath) {
    const name = path.basename(localPath)
    const key = prefix ? `${prefix}/${name}` : name
    const body = await fs.promises.readFile(localPath)

    const { url, headers } = signPut({
      endpoint, region, bucket, key, accessKeyId, secretAccessKey, body,
    })

    const res = await fetchImpl(url, {
      method: 'PUT',
      headers,
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })

    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 300)
      throw new Error(`offsite upload failed: ${res.status} ${detail}`)
    }
    return { key, bytes: body.length }
  }

  return { upload, endpoint, bucket, prefix, region }
}

module.exports = { createOffsiteBackup, signPut, deriveSigningKey }
