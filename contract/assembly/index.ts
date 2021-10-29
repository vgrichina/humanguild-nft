import { Context, PersistentUnorderedMap, PersistentMap, MapEntry, logging, storage, util, math } from 'near-sdk-as'
import { bodyUrl, htmlResponse, Web4Request, Web4Response } from './web4'

export function renderNFT(accountId: string, title: string): string {
  if (title.includes('Lisbon')) {
    return renderNFTLisbon(accountId, title);
  }

  return renderNFTGradient(accountId, title);
}

let rand_hash: Uint8Array;
let hash_position = 0;

function rand(a: i32, b: i32): i32 {
  if (hash_position >= 16) {
    rand_hash = math.hash(rand_hash);
  }
  // TODO: Support larger range than 256
  return rand_hash[hash_position] % (b - a + 1) + a;
}

function lab2rgb(lab: f64[]): f64[] {
  let y = (lab[0] + 16) / 116,
      x = lab[1] / 500 + y,
      z = y - lab[2] / 200;

  x = 0.95047 * ((x * x * x > 0.008856) ? x * x * x : (x - 16/116) / 7.787);
  y = 1.00000 * ((y * y * y > 0.008856) ? y * y * y : (y - 16/116) / 7.787);
  z = 1.08883 * ((z * z * z > 0.008856) ? z * z * z : (z - 16/116) / 7.787);

  let r = x *  3.2406 + y * -1.5372 + z * -0.4986;
  let g = x * -0.9689 + y *  1.8758 + z *  0.0415;
  let b = x *  0.0557 + y * -0.2040 + z *  1.0570;

  r = (r > 0.0031308) ? (1.055 * Math.pow(r, 1/2.4) - 0.055) : 12.92 * r;
  g = (g > 0.0031308) ? (1.055 * Math.pow(g, 1/2.4) - 0.055) : 12.92 * g;
  b = (b > 0.0031308) ? (1.055 * Math.pow(b, 1/2.4) - 0.055) : 12.92 * b;

  return [(Math.max(0, Math.min(1, r)) * 255), 
          (Math.max(0, Math.min(1, g)) * 255), 
          (Math.max(0, Math.min(1, b)) * 255)]
}

function lch2lab(lch: f64[]): f64[] {
  let l = lch[0],
      c = lch[1],
      h = lch[2];

  let hr = h / 360 * 2 * Math.PI;
  let a = c * Math.cos(hr);
  let b = c * Math.sin(hr);
  return [l, a, b];
}


function lch(l: i32, c: i32, h: i32): string {
  let rgb = lab2rgb(lch2lab([l, c, h]));
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
}

export function renderNFTLisbon(accountId: string, title: string): string {
  rand_hash = math.hash(accountId)

  const TEXT = [
    "&amp;&amp;&amp;&amp;",
    "%%%%",
    "()()",
    "{}{}",
    "[][]",
    "NEAR",
    "HUMAN",
    "QQQQ",
    "####",
    "$$$$",
    "@@@@",
    "****",
    "^^^^",
    "!!!!"
  ]

  const color1 = lch(rand(25, 75), rand(40, 100), rand(120, 275));
  const color2 = lch(rand(25, 75), rand(40, 100), rand(40, 90));
  const angle = rand(10, 35)
  // NOTE: rand can sometimes return upper range
  const text = TEXT[rand(0, TEXT.length) % TEXT.length]

  const blobPosition1 = rand(20, 40)
  const blobPosition2 = blobPosition1 + rand(10, 40)

  const rectPosition1 = rand(0, 40)
  const rectSize1 = rand(7, 21) // TODO: Decide if it's ok for 2 rects to have different size or better have the same

  const rectPosition2 = rand(70, 70)
  const rectSize2 = rand(7, 21)

  return `
  <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlns:xlink="http://www.w3.org/1999/xlink"
      version="1.1" width="400" height="400" viewBox="0 0 400 400">
    <defs>
      <clipPath id="triangle-clip">
        <polygon points="0,0 100,0 100,100"/>
      </clipPath>

      <g id="triangle-element" clip-path="url(#triangle-clip)">
        <polygon points="0,0 100,0 100,100" stroke="${color1}"/>
        <polygon points="0,0 0,${blobPosition2} ${blobPosition1},${blobPosition1} ${blobPosition2},0" stroke="${color1}" fill="${color1}" />
        <text x="40" y="40" stroke-width="0" fill="${color1}" font-size="48" transform="rotate(${angle})">${text}</text>
        <polygon points="${rectPosition1},0 ${rectPosition1 + rectSize1},0 ${rectPosition1 + rectSize1},100 ${rectPosition1},100" />
        <polygon points="0,${rectPosition2} 0,${rectPosition2 + rectSize2} 100,${rectPosition2 + rectSize2} 100,${rectPosition2}" />
      </g>

      <g id="square-element">
        <use xlink:href="#triangle-element" x="0" y="0" fill="white" stroke="${color2}" stroke-width="4px" transform="rotate(45 0 0) scale(1 -1) rotate(-45 0 0) " />
        <use xlink:href="#triangle-element" x="0" y="0" fill="white" stroke="${color2}" stroke-width="4px" />
      </g>

      <g id="tile-element">
        <use xlink:href="#square-element" />
        <use xlink:href="#square-element" transform="translate(100 0) rotate(90 50 50)" />
        <use xlink:href="#square-element" transform="translate(100 100) rotate(180 50 50)" />
        <use xlink:href="#square-element" transform="translate(0 100) rotate(270 50 50)" />
      </g>
    </defs>

    <use xlink:href="#tile-element" />
    <use xlink:href="#tile-element" transform="translate(200 0) rotate(90 100 100)" />
    <use xlink:href="#tile-element" transform="translate(200 200) rotate(180 100 100)" />
    <use xlink:href="#tile-element" transform="translate(0 200) rotate(270 100 100)" />
  </svg>
  `
}

export function renderNFTGradient(accountId: string, title: string): string {
  let seed = math.hash(accountId);
  let h1 = (seed[0] + seed[7]) % 360;
  let h2 = (seed[1] + seed[8]) % 360;
  let cx = f64(seed[2]) / 255.;
  let cy = f64(seed[3]) / 255.;
  let r = (f64(seed[4]) / 255.) * 0.7 + 1;
  let s1 = seed[5] % 80 + 20;
  let s2 = seed[6] % 80 + 20;

  const svg = `
    <svg width="512" height="512" version="1.1" xmlns="http://www.w3.org/2000/svg">
      <defs>
          <radialGradient id="RadialGradient2" cx="${cx}" cy="${cy}" r="${r}">
            <stop offset="0%" stop-color="hsl(${h1}, ${s1}%, 50%)"/>
            <stop offset="100%" stop-color="hsl(${h2}, ${s2}%, 70%)"/>
          </radialGradient>
      </defs>
      <rect x="0" y="0" rx="15" ry="15" width="100%" height="100%" fill="url(#RadialGradient2)">
      </rect>
      <text x="50%" y="48" style="font-family: sans-serif; font-size: 24px; fill: white;" text-anchor="middle" >${title}</text>
      <text x="50%" y="256" style="font-family: sans-serif; font-size: 24px; fill: white;" text-anchor="middle" >
        <tspan x="50%">I went to NFT meetup and</tspan>
        <tspan x="50%" dy="1.2em">all I got was this lousy NFT</tspan>
      </text>
      <text x="50%" y="464" style="font-family: sans-serif; font-size: 48px; fill: white;" text-anchor="middle" >${accountId}</text>
    </svg>
  `;
  return svg;
}

const NFT_SPEC = 'nft-1.0.0'
const NFT_NAME = 'Tiles of Lisbon'
const NFT_SYMBOL = 'LISBON'

@nearBindgen
class TokenMetadata {
  constructor(
    public title: string,
    public description: string,
    public copies: u8,
    public media: string,
    // public media_hash: string = '',
    public issued_at: u64,
    // public expires_at: string = '',
    // public starts_at: string = '',
    // public updated_at: string = '',
    // public extra: string = '',
    // public reference: string = '',
    // public reference_hash: string = ''
  ) { }
}

@nearBindgen
class NFTContractMetadata {
  constructor(
    public spec: string = NFT_SPEC,
    public name: string = NFT_NAME,
    public symbol: string = NFT_SYMBOL,
    public icon: string = '',
    // public base_uri: string = '',
    // public reference: string = '',
    // public reference_hash: string = '',
  ) { }
}

@nearBindgen
class Token {
    id: string
    owner_id: string
    creator: string
    metadata: TokenMetadata

    constructor(creator: string, issued_at: u64, title: string) {
      this.id = creator;
      this.creator = creator;
      this.owner_id = creator;

      const copies: u8 = 1

      let media = `http://localhost:3000/img/${creator}`;
      if (Context.contractName.endsWith('.near') || Context.contractName.endsWith('.testnet')) {
        media = `https://${Context.contractName}.page/img/${creator}`;
      }
      this.metadata = new TokenMetadata(
          title,
          `Human Guild NFT`,
          copies,
          media,
          issued_at,
      )
    }
}

const minted = new PersistentUnorderedMap<string, u64>('minted');
const titles = new PersistentMap<string, string>('title');

export function web4_get(request: Web4Request): Web4Response {
  if (request.path.startsWith('/img')) {
    const parts = request.path.split('/');
    assert(parts.length == 3);
    const accountId = parts[2];
    // TODO: Validate account ID more thoroughly to make sure code cannot be injected
    assert(!accountId.includes('&') && !accountId.includes('<'));
    const svg = renderNFT(accountId, titles.getSome(accountId));
    return { contentType: 'image/svg+xml; charset=UTF-8', body: util.stringToBytes(svg) };
  }

  // TODO: 404 and then README, etc
  return htmlResponse('not found');
}

export function nft_token(token_id: string): Token | null {
  if (!minted.contains(token_id)) {
    return null;
  }

  const issued_at = minted.getSome(token_id);
  return new Token(token_id, issued_at, titles.getSome(token_id));
}

export function nft_total_supply(): u64 {
  return minted.length;
}

export function nft_tokens(from_index: u64 = 0, limit: u8 = 0): Token[] {
  let entries: MapEntry<string, u64>[] = minted.entries(<i32>from_index, <i32>limit || minted.length);
  let tokens: Array<Token> = []

  for (let i = 0; i < entries.length; i++) {
    tokens.push(nft_token(entries[i].key)!);
  }

  return tokens
}

export function nft_supply_for_owner(account_id: string): u64 {
  if (!minted.contains(account_id)) {
    return 0;
  }

  return 1;
}

export function nft_tokens_for_owner(
  account_id: string,
  from_index: u64 = 0,
  limit: u8 = 0
): Token[] {
  if (!minted.contains(account_id) || from_index > 0 || limit < 1) {
    return [];
  }

  return [nft_token(account_id)!];
}

export function nft_metadata(): NFTContractMetadata {
  return new NFTContractMetadata();
}

function requireSelf(): void {
  assert(Context.sender == Context.contractName, 'Can only be called by self');
}

function requireSelfOrOwner(): void {
  assert(Context.sender == Context.contractName || Context.sender == storage.get('owner', '')!, 'Can only be called by self or owner');
}

// TODO: Non-standard, check what other apps ended up using
export function nft_mint_to(receiver_id: string, title: string): void {
  requireSelfOrOwner();
  assert(!minted.contains(receiver_id), `${receiver_id} minted already`);

  minted.set(receiver_id, Context.blockTimestamp);
  titles.set(receiver_id, title);
}

export function setOwner(owner: string): void {
  requireSelf();

  storage.set('owner', owner);
}