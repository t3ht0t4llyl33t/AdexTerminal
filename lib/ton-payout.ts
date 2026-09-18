import { TonClient } from '@ton/ton';
import { WalletContractV4 } from '@ton/ton';
import { mnemonicToPrivateKey } from '@ton/crypto';
import { Address, Cell, beginCell, toNano, internal as internalMessage, SendMode } from '@ton/core';

const TON_API_KEY = process.env.TONAPI_KEY || '';
const HIGHLOAD_MNEMONIC = process.env.HIGHLOAD_MNEMONIC || '';
const HIGHLOAD_SUBWALLET_ID = parseInt(process.env.HIGHLOAD_SUBWALLET_ID || '698983191', 10);

export interface PayoutRecipient {
  address: string;
  amountTon: number;
  comment?: string;
}

let cachedWallet: {
  address: Address;
  keyPair: { publicKey: Buffer; secretKey: Buffer };
} | null = null;

async function getWallet() {
  if (cachedWallet) return cachedWallet;
  if (!HIGHLOAD_MNEMONIC) throw new Error('HIGHLOAD_MNEMONIC not configured');

  const mnemonicWords = HIGHLOAD_MNEMONIC.trim().split(/\s+/);
  if (mnemonicWords.length !== 24) {
    throw new Error(`HIGHLOAD_MNEMONIC must be 24 words, got ${mnemonicWords.length}`);
  }

  const keyPair = await mnemonicToPrivateKey(mnemonicWords);
  const wallet = WalletContractV4.create({
    workchain: 0,
    publicKey: keyPair.publicKey,
    walletId: HIGHLOAD_SUBWALLET_ID,
  });

  cachedWallet = { address: wallet.address, keyPair };
  return cachedWallet;
}

export async function getHighloadAddress(): Promise<string> {
  const { address } = await getWallet();
  return address.toString();
}

function getTonClient(): TonClient {
  const headers: Record<string, string> = {};
  if (TON_API_KEY) headers['X-API-KEY'] = TON_API_KEY;
  return new TonClient({
    endpoint: 'https://tonapi.io/v2/jsonRPC',
    apiKey: TON_API_KEY || undefined,
  });
}

let queryIdCounter = 0;
let lastQueryIdTime = 0;

function nextQueryId(): bigint {
  const now = Date.now();
  if (now - lastQueryIdTime > 60000) {
    queryIdCounter = 0;
    lastQueryIdTime = now;
  }
  queryIdCounter++;
  return BigInt(Math.floor(now / 1000)) * BigInt(1000000) + BigInt(queryIdCounter);
}

export async function getWalletBalance(): Promise<number> {
  const client = getTonClient();
  const { address } = await getWallet();
  const balance = await client.getBalance(address);
  return Number(balance) / 1e9;
}

export async function sendBatchPayouts(
  recipients: PayoutRecipient[],
): Promise<{ success: boolean; txCount: number; error?: string }> {
  if (recipients.length === 0) return { success: true, txCount: 0 };
  if (recipients.length > 250) {
    return { success: false, txCount: 0, error: 'Max 250 recipients per batch' };
  }

  try {
    const client = getTonClient();
    const { address, keyPair } = await getWallet();

    const wallet = WalletContractV4.create({
      workchain: 0,
      publicKey: keyPair.publicKey,
      walletId: HIGHLOAD_SUBWALLET_ID,
    });

    const seqno = await client.runMethod(address, 'seqno').then((r) => r.stack.readNumber());

    const messages = recipients.map((r) =>
      internalMessage({
        to: Address.parse(r.address),
        value: toNano(r.amountTon),
        body: r.comment
          ? beginCell().storeUint(0, 32).storeStringTail(r.comment).endCell()
          : beginCell().storeUint(0, 32).endCell(),
      }),
    );

    const transfer = wallet.createTransfer({
      seqno,
      secretKey: keyPair.secretKey,
      messages,
      sendMode: SendMode.PAY_GAS_SEPARATELY | SendMode.IGNORE_ERRORS,
      timeout: Math.floor(Date.now() / 1000) + 300,
    });

    await client.sendFile(transfer.toBoc());

    return { success: true, txCount: recipients.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[TonPayoutService] Batch payout failed:', msg);
    return { success: false, txCount: 0, error: msg };
  }
}

function storeTransfer(transfer: Cell) {
  return (builder: { storeSlice: (s: unknown) => void }) => {
    builder.storeSlice(transfer.beginParse());
  };
}

export async function transferExcessToMaster(
  masterAddress: string,
): Promise<{ success: boolean; transferred: number; error?: string }> {
  try {
    const balance = await getWalletBalance();
    const KEEP_RESERVE = 20;
    const GAS = 0.02;

    if (balance <= KEEP_RESERVE + GAS) {
      return { success: true, transferred: 0 };
    }

    const amountToSend = balance - KEEP_RESERVE - GAS;

    const result = await sendBatchPayouts([
      {
        address: masterAddress,
        amountTon: amountToSend,
        comment: 'Highload Wallet excess sweep',
      },
    ]);

    if (!result.success) {
      return { success: false, transferred: 0, error: result.error };
    }

    return { success: true, transferred: amountToSend };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, transferred: 0, error: msg };
  }
}
