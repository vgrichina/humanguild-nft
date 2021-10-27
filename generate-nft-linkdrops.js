const { connect, KeyPair, utils } = require('near-api-js');
const { InMemoryKeyStore, UnencryptedFileSystemKeyStore } = require('near-api-js/lib/key_stores');
const { KeyPairEd25519 } = require('near-api-js/lib/utils');
const { generateSeedPhrase, parseSeedPhrase  } = require('near-seed-phrase');

// const LINKDROP_CONTRACT = 'linkdrop.vg';
const LINKDROP_CONTRACT = 'linkdrop.humanguild.near';
const NUM_LINKS = 100;

(async function() {
    const config = require('./src/config')(process.env.NODE_ENV || 'development');
    const near = await connect({
        ...config,
        keyStore: new UnencryptedFileSystemKeyStore(`${process.env.HOME}/.near-credentials/`)
    });
    const { seedPhrase } = generateSeedPhrase(); 
    console.log('seedPhrase', seedPhrase);

    const account = await near.account(LINKDROP_CONTRACT);
    for (let i = 0; i < NUM_LINKS; i++) {
        let { secretKey } = parseSeedPhrase(seedPhrase, `m/44'/397'/0'/${i}'`);
        let keyPair = KeyPair.fromString(secretKey);
        console.log(`${config.walletUrl}/linkdrop/${LINKDROP_CONTRACT}/${keyPair}`);
        await account.functionCall(LINKDROP_CONTRACT, 'send_with_transactions', {
            public_key: keyPair.getPublicKey().toString().replace('ed25519:', ''),
            tokens: utils.format.parseNearAmount('0.42'),
            transactions: [{
                receiver_id: config.contractName,
                actions: [{
                    method_name: "nft_mint_to",
                    args: JSON.stringify({
                        receiver_id: "%%RECEIVER_ID%%", 
                        title: "Ode to Lisbon"
                    }),
                    gas: "10000000000000",
                    deposit: "1"
                }]
            }]
        });
        await account.addKey(keyPair.getPublicKey(), LINKDROP_CONTRACT, ['claim', 'create_account_and_claim'], utils.format.parseNearAmount('1.0'));
    }
})();