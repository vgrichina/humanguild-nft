import { Context, PersistentUnorderedMap, PersistentMap, MapEntry, logging, storage, util, math } from 'near-sdk-as'
import { bodyUrl, htmlResponse, Web4Request, Web4Response } from './web4'

const NFT_SPEC = 'nft-1.0.0'
const NFT_NAME = 'Human Game Jam'
const NFT_SYMBOL = 'JAM'

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

      let media = `QmTZvmf4ttDGqYKUk53Dsyq2hE9kXF1aqz2x3Be4cuuWzt`;
      this.metadata = new TokenMetadata(
          `${title}: ${creator}`,
          `Human Game Jam`,
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
    return bodyUrl("ipfs://bafybeicnwesuph5jf6dx73f4sgs5tiaxa4idgnvwkglg4voh773ocus7we");
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