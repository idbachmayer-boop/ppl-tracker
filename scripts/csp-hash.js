#!/usr/bin/env node
/* Content-Security-Policy hash for index.html's one inline <script>.
 *
 *   npm run csp:hash    rewrites the sha256 token in the CSP <meta>'s script-src, in place.
 *                       Run it after ANY edit to the inline script: one changed byte and the
 *                       browser refuses to run the app, which reads as a blank page.
 *   npm run csp:check   exits 1 if that token is stale, naming the command that fixes it.
 *
 *   node scripts/csp-hash.js [--check] [file]     (file defaults to the repo's index.html)
 *
 * No build step and no dependency: this edits one attribute value, by hand, on request, and
 * nothing ever runs the rewrite automatically.
 *
 * CR and CRLF are normalised to LF before hashing because the HTML parser does exactly that before
 * the browser hashes the script. So a Windows checkout with CRLF copies hashes the same as the LF
 * blob git stores and Pages serves. The Chrome-reported vector in the suite proves the match. */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const INLINE = /<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g;          // same regex as test/harness.js
const CSP_MARK = /http-equiv="Content-Security-Policy"/gi;
const META = /<meta http-equiv="Content-Security-Policy" content="([^"]*)"/i;
const SHA = /^'sha256-/;

function inlineScriptHash(html){
  const m = [...html.matchAll(INLINE)];
  if(m.length !== 1) throw new Error(`expected exactly one inline <script>, found ${m.length}`);
  const text = m[0][1].replace(/\r\n?/g, '\n');
  return 'sha256-' + crypto.createHash('sha256').update(text, 'utf8').digest('base64');
}

/* Directive name (lower-cased) → its tokens as written. null when the page has no CSP meta; throws
   on anything ambiguous, because a guess here either blanks the app or silently weakens the policy. */
function readPolicy(html){
  const metas = (html.match(CSP_MARK) || []).length;
  if(metas === 0) return null;
  if(metas > 1) throw new Error(`expected at most one CSP <meta>, found ${metas}`);
  const m = META.exec(html);
  if(!m) throw new Error('the CSP <meta> could not be read: expected <meta http-equiv="Content-Security-Policy" content="…">');
  const d = Object.create(null);
  m[1].split(';').map(s => s.trim()).filter(Boolean).forEach(seg => {
    const [name, ...tokens] = seg.split(/\s+/);
    const key = name.toLowerCase();
    if(key in d) throw new Error(`repeated directive ${key}`);
    d[key] = tokens;
  });
  return d;
}

module.exports = { inlineScriptHash, readPolicy };

if(require.main === module){
  const fail = msg => { console.error(msg); process.exit(1); };
  const args = process.argv.slice(2);
  const flags = args.filter(a => a.startsWith('--'));
  const files = args.filter(a => !a.startsWith('--'));
  /* A typo'd --check must never fall through to the rewrite. */
  if(flags.some(f => f !== '--check') || files.length > 1) fail('usage: node scripts/csp-hash.js [--check] [file]');
  const check = flags.includes('--check');
  const file = files[0] || path.join(__dirname, '..', 'index.html');

  let raw, html, pol, want;
  try{
    raw = fs.readFileSync(file);
    html = raw.toString('utf8');
    pol = readPolicy(html);
    if(!pol) fail(`no CSP <meta http-equiv="Content-Security-Policy"> in ${file}`);
    want = inlineScriptHash(html);
  }catch(e){
    fail(`${e.message} in ${file}`);
  }
  const have = (pol['script-src'] || []).filter(t => SHA.test(t));

  if(check){
    if(have.length === 1 && have[0] === `'${want}'`){ console.log('CSP hash OK ' + want); process.exit(0); }
    fail(`CSP hash stale: policy has ${have.join(' ') || 'none'}, the inline script is '${want}'. Run: npm run csp:hash`);
  }

  if(have.length !== 1) fail(`expected exactly one 'sha256-…' source in script-src, found ${have.length} in ${file}`);
  /* Decoding and re-encoding must round-trip, or the write would alter bytes this tool does not own. */
  if(!Buffer.from(html, 'utf8').equals(raw)) fail(`${file} is not valid UTF-8; refusing to rewrite it`);
  /* Only the token, only inside the script-src segment of the one CSP meta. Replacer functions
     throughout, so a `$` in the input can never be read as a replacement pattern. */
  const out = html.replace(META, (all, content) => {
    const next = content.replace(/(^|;)([^;]*)/g, (seg, lead, body) => {
      if((body.trim().split(/\s+/)[0] || '').toLowerCase() !== 'script-src') return seg;
      return lead + body.replace(/\S+/g, tok => tok === have[0] ? `'${want}'` : tok);
    });
    return all.slice(0, all.length - content.length - 1) + next + '"';
  });
  if(out !== html) fs.writeFileSync(file, out, 'utf8');
  console.log((out !== html ? 'updated ' : 'unchanged ') + want);
}
