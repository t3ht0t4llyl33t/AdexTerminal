import { mnemonicNew, mnemonicToPrivateKey } from '@ton/crypto';
import { WalletContractV4 } from '@ton/ton';

async function main() {
  const mnemonic = await mnemonicNew(24);
  const mnemonicString = mnemonic.join(' ');

  const keyPair = await mnemonicToPrivateKey(mnemonic);

  const subwalletId = 698983191;

  const wallet = WalletContractV4.create({
    workchain: 0,
    publicKey: keyPair.publicKey,
    walletId: subwalletId,
  });

  const address = wallet.address.toString({ urlSafe: true, bounceable: true });

  console.log('========================================');
  console.log('  Highload Wallet V4 — Generated');
  console.log('========================================');
  console.log('');
  console.log('Address (bounceable):');
  console.log(address);
  console.log('');
  console.log('Mnemonic (24 words — KEEP SECRET, store in .env):');
  console.log(mnemonicString);
  console.log('');
  console.log('Subwallet ID:');
  console.log(subwalletId);
  console.log('');
  console.log('Public Key (hex):');
  console.log(keyPair.publicKey.toString('hex'));
  console.log('');
  console.log('========================================');
  console.log('  NEXT STEPS');
  console.log('========================================');
  console.log('1. Copy the mnemonic above');
  console.log('2. Add to .env as HIGHLOAD_MNEMONIC="<24 words>"');
  console.log('3. Add HIGHLOAD_SUBWALLET_ID=698983191');
  console.log('4. Send at least 1 TON to the address above to activate');
  console.log('5. Redeploy the app');
}

main().catch(console.error);
