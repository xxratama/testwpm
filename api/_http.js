/** Helper HTTP bersama untuk fungsi di folder api/. */
const crypto = require('crypto');

function send(res, code, body) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString() || '{}');
}

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';
function rid(n) {
  return Array.from(crypto.randomBytes(n), (b) => ALPHABET[b % 32]).join('');
}

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();

/** Bandingkan dua string tanpa membocorkan info lewat waktu proses. */
function safeEqual(a, b) {
  return crypto.timingSafeEqual(sha(a), sha(b));
}

module.exports = { send, readBody, rid, sha, safeEqual };
