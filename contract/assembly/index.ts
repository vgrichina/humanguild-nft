import { Context, PersistentUnorderedMap, PersistentMap, MapEntry, logging, storage, util, math } from 'near-sdk-as'
import { bodyUrl, htmlResponse, Web4Request, Web4Response } from './web4'

export function renderNFT(accountId: string, title: string): string {
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
const NFT_NAME = 'HumanGuild NFT meetup'
const NFT_SYMBOL = 'HUMAN'

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
          `NFT Dolores Park`,
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