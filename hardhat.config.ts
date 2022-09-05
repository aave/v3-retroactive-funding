import { HardhatUserConfig } from 'hardhat/config';

import '@typechain/hardhat';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-waffle';
import '@nomiclabs/hardhat-etherscan';
import '@typechain/ethers-v5';
import 'hardhat-dependency-compiler';
import 'hardhat-tracer';

import dotenv from 'dotenv';

dotenv.config();

if (process.env.SKIP_LOAD !== 'true') {
  // eslint-disable-next-line global-require
  require('./tasks/ethereum/submit.ts');
  require('./tasks/helpers/set-DRE.ts');
  require('./tasks/helpers/deploy-proposal-payload.ts');
  require('./tasks/1-create-proposal-payload.ts');
  require('./tasks/2-submit-proposal.ts');
}

const INFURA_KEY = process.env.INFURA_KEY || '';
const ALCHEMY_KEY = process.env.ALCHEMY_KEY || '';

export const NETWORKS_RPC_URL = {
  ['kovan']: ALCHEMY_KEY
    ? `https://eth-kovan.alchemyapi.io/v2/${ALCHEMY_KEY}`
    : `https://kovan.infura.io/v3/${INFURA_KEY}`,
  ['ropsten']: ALCHEMY_KEY
    ? `https://eth-ropsten.alchemyapi.io/v2/${ALCHEMY_KEY}`
    : `https://ropsten.infura.io/v3/${INFURA_KEY}`,
  ['rinkeby']: ALCHEMY_KEY
    ? `https://eth-rinkeby.alchemyapi.io/v2/${ALCHEMY_KEY}`
    : `https://rinkeby.infura.io/v3/${INFURA_KEY}`,
  ['goerli']: ALCHEMY_KEY
    ? `https://eth-goerli.alchemyapi.io/v2/${ALCHEMY_KEY}`
    : `https://goerli.infura.io/v3/${INFURA_KEY}`,
  ['main']: ALCHEMY_KEY
    ? `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_KEY}`
    : `https://mainnet.infura.io/v3/${INFURA_KEY}`,
  ['coverage']: 'http://localhost:8555',
  ['hardhat']: 'http://localhost:8545',
  ['buidlerevm']: 'http://localhost:8545',
  // ['tenderlyMain']: `https://rpc.tenderly.co/fork/${TENDERLY_FORK}`,
  ['mumbai']: 'https://rpc-mumbai.maticvigil.com',
  ['matic']: `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  //   ['xdai']: 'https://rpc.xdaichain.com/',
  //   ['arbitrum']: `https://arb1.arbitrum.io/rpc`,
  //   ['arbitrumTestnet']: `https://rinkeby.arbitrum.io/rpc`,
  //   ['main']: `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  //   ['testnet']: `https://opt-kovan.g.alchemy.com/v2/${ALCHEMY_KEY}`,
};

export const BUIDLEREVM_CHAIN_ID = 31337;
const balance = '1000000000000000000000000';

const accounts = [
  {
    secretKey: '0xc5e8f61d1ab959b397eecc0a37a6517b8e67a0e7cf1f4bce5591f3ed80199122',
    balance,
  },
  {
    secretKey: '0xd49743deccbccc5dc7baa8e69e5be03298da8688a15dd202e20f15d5e0e9a9fb',
    balance,
  },
  {
    secretKey: '0x23c601ae397441f3ef6f1075dcb0031ff17fb079837beadaf3c84d96c6f3e569',
    balance,
  },
  {
    secretKey: '0xee9d129c1997549ee09c0757af5939b2483d80ad649a0eda68e8b0357ad11131',
    balance,
  },
  {
    secretKey: '0x87630b2d1de0fbd5044eb6891b3d9d98c34c8d310c852f98550ba774480e47cc',
    balance,
  },
  {
    secretKey: '0x275cc4a2bfd4f612625204a20a2280ab53a6da2d14860c47a9f5affe58ad86d4',
    balance,
  },
  {
    secretKey: '0xaee25d55ce586148a853ca83fdfacaf7bc42d5762c6e7187e6f8e822d8e6a650',
    balance,
  },
  {
    secretKey: '0xa2e0097c961c67ec197b6865d7ecea6caffc68ebeb00e6050368c8f67fc9c588',
    balance,
  },
];

const DEFAULT_BLOCK_GAS_LIMIT = 30000000;
const DEFAULT_GAS_PRICE = Number(process.env.DEFAULT_GAS_PRICE) || 56000000000; // 50 gwei
const HARDFORK = 'berlin';
const ETHERSCAN_KEY = process.env.ETHERSCAN_KEY || '';
const MNEMONIC_PATH = "m/44'/60'/0'/0";
const MNEMONIC = process.env.MNEMONIC || '';
const NETWORK_FORK = process.env.NETWORK_FORK;
const FORKING_BLOCK = process.env.FORKING_BLOCK;

const mainnetFork =
  NETWORK_FORK && FORKING_BLOCK
    ? {
        // eslint-disable-next-line radix
        blockNumber: parseInt(FORKING_BLOCK),
        url: NETWORKS_RPC_URL[NETWORK_FORK || 'main'],
        // url: ALCHEMY_KEY
        //   ? `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_KEY}`
        //   : `https://main.infura.io/v3/${INFURA_KEY}`,
      }
    : undefined;

const getCommonNetworkConfig = (networkName: string, networkId: number) => ({
  url: NETWORKS_RPC_URL[networkName],
  hardfork: HARDFORK,
  blockGasLimit: DEFAULT_BLOCK_GAS_LIMIT,
  gasPrice: DEFAULT_GAS_PRICE,
  chainId: networkId,
  accounts: {
    mnemonic: MNEMONIC,
    path: MNEMONIC_PATH,
    initialIndex: 0,
    count: 20,
  },
});

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.6.12',
        settings: {
          optimizer: { enabled: true, runs: 200 },
          evmVersion: 'istanbul',
        },
      },
      {
        version: '0.7.5',
        settings: {
          optimizer: { enabled: true, runs: 200 },
          evmVersion: 'istanbul',
        },
      },
      {
        version: '0.8.10',
        settings: {
          optimizer: { enabled: true, runs: 200 },
          evmVersion: 'berlin',
        },
      },
    ],
  },
  typechain: {
    outDir: 'types',
    target: 'ethers-v5',
  },
  etherscan: {
    apiKey: ETHERSCAN_KEY,
  },
  defaultNetwork: 'hardhat',
  mocha: {
    timeout: 0,
    bail: true,
  },
  networks: {
    kovan: getCommonNetworkConfig('kovan', 42),
    ropsten: getCommonNetworkConfig('ropsten', 3),
    main: getCommonNetworkConfig('main', 1),
    matic: getCommonNetworkConfig('matic', 137),
    hardhat: {
      hardfork: HARDFORK,
      blockGasLimit: DEFAULT_BLOCK_GAS_LIMIT,
      gas: DEFAULT_BLOCK_GAS_LIMIT,
      gasPrice: DEFAULT_GAS_PRICE,
      chainId: BUIDLEREVM_CHAIN_ID,
      throwOnTransactionFailures: true,
      throwOnCallFailures: true,
      // eslint-disable-next-line no-shadow
      accounts: accounts.map(({ secretKey, balance }: { secretKey: string; balance: string }) => ({
        privateKey: secretKey,
        balance,
      })),
      forking: mainnetFork,
    },
    coverage: {
      url: 'http://localhost:8555',
    },
  },
  dependencyCompiler: {
    paths: [
      '@aave/governance-v2/contracts/interfaces/IAaveGovernanceV2.sol',
      '@aave/governance-bridge/contracts/PolygonBridgeExecutor.sol',
      '@maticnetwork/fx-portal/contracts/FxChild.sol',
      '@aave/core-v3/contracts/dependencies/openzeppelin/upgradeability/InitializableAdminUpgradeabilityProxy.sol',
      '@openzeppelin/contracts/access/Ownable.sol',
    ],
  },
};

export default config;
