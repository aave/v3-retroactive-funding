import rawHRE, { ethers } from 'hardhat';
import { expect } from 'chai';
import { BigNumber, Signer } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import { loadConfig } from '../helpers/config-loader';
import { BalanceInfo, fetchBalances, ProposalStates } from './utils/helpers';
import { getImpersonatedSigner, setBalance } from '../helpers/misc-utils';
import { passVoteAndExecute } from './utils/helpers';
import {
  IAaveGovernanceV2,
  IAaveGovernanceV2__factory,
  IERC20,
  IERC20__factory,
  EthereumProposalPayload__factory,
  PolygonBridgeExecutor__factory,
  PolygonProposalPayload__factory,
  IInitializableAdminUpgradeabilityProxy__factory,
  Ownable__factory,
  InitializableAdminUpgradeabilityProxy__factory,
  FxChild__factory,
  PolygonBridgeExecutor,
  ICollector__factory,
} from '../types';

import data from '../data.json';

const config = loadConfig();

// Address to user for the submission
const PROPOSER_ADDRESS = '0xdC6d052700A2bB1F45852a65ACB61C194ef09B61';

const CONSTANTS = {
  ETHEREUM: {
    // Receiver address
    RECEIVER_ADDRESS: config.ETHEREUM_RECEIVER,
    // Collector address
    COLLECTOR_ADDRESS: '0x464C71f6c2F760DdA6093dCB91C24c39e5d6e18c',
    // Ecosystem Reserve address
    ECOSYSTEM_RESERVE_ADDRESS: '0x25F2226B597E8F9514B3F68F00f494cF4f286491',
    // Aave Token
    AAVE_TOKEN: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
    // AAVE amount to transfer
    AAVE_AMOUNT_TO_RETRIEVE: '76196367343821000000000', // 76196.367343821000000000
    // Aave Governance
    AAVE_GOVERNANCE_ADDRESS: config.AAVE_GOVERNANCE_ADDRESS,
    // AAVE Whale
    AAVE_WHALE_ADDRESS: '0x25F2226B597E8F9514B3F68F00f494cF4f286491',
  },
  POLYGON: {
    // Receiver address
    RECEIVER_ADDRESS: config.POLYGON_RECEIVER,
    // Collector address
    COLLECTOR_ADDRESS: '0x7734280A4337F37Fbf4651073Db7c28C80B339e9',
    // Collector V3 address
    COLLECTOR_ADDRESS_V3: '0xe8599F3cc5D38a9aD6F3684cd5CEa72f10Dbc383',
    // New Collector Implementation
    COLLECTOR_IMPLEMENTATION_ADDRESS: '0xC773bf5a987b29DdEAC77cf1D48a22a4Ce5B0577',
    // Collector Controller
    CONTROLLER_OF_COLLECTOR: '0xDB89487A449274478e984665b8692AfC67459deF',
    // Polygon Bridge Executor
    POLYGON_BRIDGE_EXECUTOR_ADDRESS: config.POLYGON_BRIDGE_EXECUTOR_ADDRESS,
    // Fxportal Spoof Address
    FXPORTAL_SPOOF_ADDRESS: '0x0000000000000000000000000000000000001001',
    // Fxportal FxChild Address
    FXPORTAL_FXCHILD_ADDRESS: '0x8397259c983751DAf40400790063935a11afa28a',
  },
};

describe('E2E test', () => {
  // Event emitted by Polygon FxPortal for cross-chain message
  let fxportalEvent;

  describe('Ethereum: Submission of the proposal', () => {
    let gov: IAaveGovernanceV2;
    let aave: IERC20;

    let user: SignerWithAddress;
    let proposer: Signer;

    const balances = {
      treasury: {} as BalanceInfo,
      receiver: {} as BalanceInfo,
    };

    before(async () => {
      await rawHRE.run('set-DRE');

      console.log('Network:', rawHRE.network.name);

      [user] = await rawHRE.ethers.getSigners();

      gov = IAaveGovernanceV2__factory.connect(CONSTANTS.ETHEREUM.AAVE_GOVERNANCE_ADDRESS, user);
      aave = IERC20__factory.connect(CONSTANTS.ETHEREUM.AAVE_TOKEN, user);
    });

    it('Fetch receiver balances', async () => {
      // Ethereum
      const aTokenAddresses = data.ethereum.map((a) => a.aToken);
      const symbols = data.ethereum.map((a) => a.symbol);
      balances.receiver = await fetchBalances(
        aTokenAddresses,
        symbols,
        user,
        CONSTANTS.ETHEREUM.RECEIVER_ADDRESS
      );
      balances.treasury = await fetchBalances(
        aTokenAddresses,
        symbols,
        user,
        CONSTANTS.ETHEREUM.COLLECTOR_ADDRESS
      );

      const aaveToken = IERC20__factory.connect(CONSTANTS.ETHEREUM.AAVE_TOKEN, user);
      balances.receiver.AAVE = await aaveToken.balanceOf(CONSTANTS.ETHEREUM.RECEIVER_ADDRESS);
      balances.treasury.AAVE = await aaveToken.balanceOf(
        CONSTANTS.ETHEREUM.ECOSYSTEM_RESERVE_ADDRESS
      );
    });

    it('Submits governance proposal', async () => {
      // Using given `PROPOSER_ADDRESS` for the submission
      proposer = await getImpersonatedSigner(PROPOSER_ADDRESS);
      await setBalance(PROPOSER_ADDRESS, ethers.utils.parseEther('5'));

      // Deploy proposal payload
      let proposalPayloadAddress = config.ETHEREUM_PROPOSAL_PAYLOAD_ADDRESS;
      if (proposalPayloadAddress == '') {
        proposalPayloadAddress = await rawHRE.run('deploy-ethereum-proposal-payload', {
          // Impersonating
          impersonateSignerAddress: await proposer.getAddress(),
        });
      }
      const proposalPayload = await EthereumProposalPayload__factory.connect(
        proposalPayloadAddress,
        proposer
      );

      // Check receiver
      expect(await proposalPayload.AAVE_COMPANIES_ADDRESS()).to.be.eq(
        CONSTANTS.ETHEREUM.RECEIVER_ADDRESS
      );

      // Submit governance proposal
      const proposalId = await rawHRE.run('ethereum:submit', {
        ethereumProposalPayloadAddress: proposalPayloadAddress,
        polygonProposalPayloadAddress: config.POLYGON_PROPOSAL_PAYLOAD_ADDRESS,
        aaveShortExecutorAddress: config.AAVE_SHORT_EXECUTOR_ADDRESS,
        aaveGovernanceAddress: config.AAVE_GOVERNANCE_ADDRESS,
        polygonBridgeExecutorAddress: config.POLYGON_BRIDGE_EXECUTOR_ADDRESS,
        polygonFxrootAddress: config.POLYGON_FXROOT,
        ipfsHash: config.IPFS_HASH,
        // Impersonating
        impersonateSignerAddress: await proposer.getAddress(),
      });

      const aaveWhaleVoter = await getImpersonatedSigner(CONSTANTS.ETHEREUM.AAVE_WHALE_ADDRESS);
      await setBalance(CONSTANTS.ETHEREUM.AAVE_WHALE_ADDRESS, ethers.utils.parseEther('5'));

      const executionTx = await passVoteAndExecute(gov, aaveWhaleVoter, proposalId);
      console.log('GasUsed:', (await executionTx.wait()).gasUsed.toString());
      expect(executionTx).to.emit(proposalPayload, 'ProposalExecuted');

      const receipt = await executionTx.wait();

      // Event data of FxPortal's StaSender
      const stateSenderInterface = new ethers.utils.Interface([
        'event StateSynced(uint256 indexed id, address indexed contractAddress, bytes data)',
      ]);
      const stateSyncedEventTopic = stateSenderInterface.getEventTopic('StateSynced');
      const stateSyncedRaw = receipt.logs.filter((l) => l.topics[0] == stateSyncedEventTopic)[0];
      const event = stateSenderInterface.decodeEventLog(
        'StateSynced',
        stateSyncedRaw.data,
        stateSyncedRaw.topics
      );
      fxportalEvent = event.data;

      expect(await gov.getProposalState(proposalId)).to.equal(ProposalStates.EXECUTED);
    });

    it('Check balances', async () => {
      const aTokenAddresses = data.ethereum.map((a) => a.aToken);
      const symbols = data.ethereum.map((a) => a.symbol);
      const receiverAfter = await fetchBalances(
        aTokenAddresses,
        symbols,
        user,
        CONSTANTS.ETHEREUM.RECEIVER_ADDRESS
      );
      const treasuryAfter = await fetchBalances(
        aTokenAddresses,
        symbols,
        user,
        CONSTANTS.ETHEREUM.COLLECTOR_ADDRESS
      );

      // AAVE
      const aaveToken = IERC20__factory.connect(CONSTANTS.ETHEREUM.AAVE_TOKEN, user);
      receiverAfter.AAVE = await aaveToken.balanceOf(CONSTANTS.ETHEREUM.RECEIVER_ADDRESS);
      treasuryAfter.AAVE = await aaveToken.balanceOf(CONSTANTS.ETHEREUM.ECOSYSTEM_RESERVE_ADDRESS);

      const findAmountToTransfer = (symbol: string) => {
        return data.ethereum.find((item) => item.symbol == symbol)?.fullAmount || 0;
      };

      for (let i = 0; i < Object.keys(receiverAfter).length; i++) {
        const token = Object.keys(receiverAfter)[i];

        let amountToTransfer = findAmountToTransfer(token);

        if (token == 'AAVE') {
          amountToTransfer = CONSTANTS.ETHEREUM.AAVE_AMOUNT_TO_RETRIEVE;
        }

        // Receiver: AfterBalance should be BeforeBalance + amount
        expect(receiverAfter[token]).to.be.closeTo(
          balances.receiver[token].add(amountToTransfer),
          1
        );

        // Treasury: AfterBalance should be higher than BeforeBalance - amount
        expect(treasuryAfter[token]).to.be.gte(balances.treasury[token].sub(amountToTransfer));
      }
    });
  });

  describe('Polygon: Execution of ActionSet via PolygonBridgeExecutor', () => {
    let user: SignerWithAddress;

    let fxportalSpoof: Signer;
    let proposalId: BigNumber;

    let polygonBridgeExecutor: PolygonBridgeExecutor;

    const balances = {
      treasury: {} as BalanceInfo,
      receiver: {} as BalanceInfo,
    };

    before(async () => {
      // Set fork to Polygon chain
      await rawHRE.network.provider.request({
        method: 'hardhat_reset',
        params: [
          {
            forking: {
              blockNumber: BigNumber.from(process.env.FORKING_BLOCK_POLYGON).toNumber(),
              jsonRpcUrl: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`,
            },
          },
        ],
      });

      [user] = await rawHRE.ethers.getSigners();
      console.log('Network:', rawHRE.network.name);

      fxportalSpoof = await getImpersonatedSigner(CONSTANTS.POLYGON.FXPORTAL_SPOOF_ADDRESS);
      await setBalance(await fxportalSpoof.getAddress(), BigNumber.from('0x8AC7230489E80000'));

      polygonBridgeExecutor = await PolygonBridgeExecutor__factory.connect(
        CONSTANTS.POLYGON.POLYGON_BRIDGE_EXECUTOR_ADDRESS,
        user
      );
    });

    it('Spoof cross-chain transaction (StateSender)', async () => {
      const proposalCount = await polygonBridgeExecutor.getActionsSetCount();
      proposalId = proposalCount;

      expect(
        await FxChild__factory.connect(
          CONSTANTS.POLYGON.FXPORTAL_FXCHILD_ADDRESS,
          fxportalSpoof
        ).onStateReceive(BigNumber.from(123456789), fxportalEvent)
      ).to.emit(polygonBridgeExecutor, 'ActionsSetQueued');

      expect(await polygonBridgeExecutor.getActionsSetCount()).to.be.eq(proposalCount.add(1));
    });

    it('Fetch receiver balances', async () => {
      const aTokenAddresses = data.polygon.map((a) => a.aToken);
      const symbols = data.polygon.map((a) => a.symbol);
      balances.receiver = await fetchBalances(
        aTokenAddresses,
        symbols,
        user,
        CONSTANTS.POLYGON.RECEIVER_ADDRESS
      );
      balances.treasury = await fetchBalances(
        aTokenAddresses,
        symbols,
        user,
        CONSTANTS.POLYGON.COLLECTOR_ADDRESS
      );
    });

    it('Transfers ownership of AaveCollector to PolygonBridgeExecutor', async () => {
      const multisigSpoof = await getImpersonatedSigner(
        '0xbb2f3ba4a63982ed6d93c190c28b15cbba0b6af3'
      );
      await setBalance(await multisigSpoof.getAddress(), BigNumber.from('0x8AC7230489E80000'));

      const collectorProxy = InitializableAdminUpgradeabilityProxy__factory.connect(
        CONSTANTS.POLYGON.COLLECTOR_ADDRESS,
        multisigSpoof
      );

      expect(
        await collectorProxy
          .connect(multisigSpoof)
          .changeAdmin(CONSTANTS.POLYGON.POLYGON_BRIDGE_EXECUTOR_ADDRESS)
      );

      const polygonBridgeExecutorSigner = await getImpersonatedSigner(
        CONSTANTS.POLYGON.POLYGON_BRIDGE_EXECUTOR_ADDRESS
      );
      expect(await collectorProxy.connect(polygonBridgeExecutorSigner).callStatic.admin()).to.be.eq(
        await polygonBridgeExecutorSigner.getAddress()
      );
    });

    it('Executes payload', async () => {
      const collectorImple = ICollector__factory.connect(
        CONSTANTS.POLYGON.COLLECTOR_IMPLEMENTATION_ADDRESS,
        user
      );
      expect(await collectorImple.REVISION()).to.be.eq(2);

      // Deploy proposal payload
      let proposalPayloadAddress = config.POLYGON_PROPOSAL_PAYLOAD_ADDRESS;
      if (proposalPayloadAddress == '') {
        proposalPayloadAddress = await rawHRE.run('deploy-polygon-proposal-payload');
      }
      const proposalPayload = await PolygonProposalPayload__factory.connect(
        proposalPayloadAddress,
        user
      );

      // Check receiver
      expect(await proposalPayload.AAVE_COMPANIES_ADDRESS()).to.be.eq(
        CONSTANTS.POLYGON.RECEIVER_ADDRESS
      );

      // Execution
      await rawHRE.network.provider.send('evm_increaseTime', [172801]);

      expect(await polygonBridgeExecutor.execute(proposalId, { gasLimit: 30000000 }));
    });

    it('Check balances', async () => {
      const aTokenAddresses = data.polygon.map((a) => a.aToken);
      const symbols = data.polygon.map((a) => a.symbol);
      const receiverAfter = await fetchBalances(
        aTokenAddresses,
        symbols,
        user,
        CONSTANTS.POLYGON.RECEIVER_ADDRESS
      );
      const treasuryAfter = await fetchBalances(
        aTokenAddresses,
        symbols,
        user,
        CONSTANTS.POLYGON.COLLECTOR_ADDRESS
      );

      const findAmountToTransfer = (symbol: string) => {
        return data.polygon.find((item) => item.symbol == symbol)?.fullAmount || 0;
      };

      for (let i = 0; i < Object.keys(receiverAfter).length; i++) {
        const token = Object.keys(receiverAfter)[i];

        let amountToTransfer = findAmountToTransfer(token);

        // Receiver: AfterBalance should be BeforeBalance + amount
        expect(receiverAfter[token]).to.be.closeTo(
          balances.receiver[token].add(amountToTransfer),
          1
        );

        // Treasury: AfterBalance should be higher than BeforeBalance - amount
        expect(treasuryAfter[token]).to.be.gte(balances.treasury[token].sub(amountToTransfer));
      }
    });

    it('Check upgrade', async () => {
      const collector = ICollector__factory.connect(CONSTANTS.POLYGON.COLLECTOR_ADDRESS, user);
      expect(await collector.REVISION()).to.be.eq(2);
      const collectorV3 = ICollector__factory.connect(CONSTANTS.POLYGON.COLLECTOR_ADDRESS_V3, user);
      expect(await collectorV3.REVISION()).to.be.eq(2);
    });

    it('Check owners', async () => {
      const collector = ICollector__factory.connect(CONSTANTS.POLYGON.COLLECTOR_ADDRESS, user);
      expect(await collector.getFundsAdmin()).to.be.eq(CONSTANTS.POLYGON.CONTROLLER_OF_COLLECTOR);
      const collectorV3 = ICollector__factory.connect(CONSTANTS.POLYGON.COLLECTOR_ADDRESS_V3, user);
      expect(await collectorV3.getFundsAdmin()).to.be.eq(CONSTANTS.POLYGON.CONTROLLER_OF_COLLECTOR);

      const polygonBridgeExecutorSigner = await getImpersonatedSigner(
        CONSTANTS.POLYGON.POLYGON_BRIDGE_EXECUTOR_ADDRESS
      );
      const collectorProxy = IInitializableAdminUpgradeabilityProxy__factory.connect(
        CONSTANTS.POLYGON.COLLECTOR_ADDRESS,
        polygonBridgeExecutorSigner
      );
      expect(await collectorProxy.callStatic.admin()).to.be.eq(
        CONSTANTS.POLYGON.POLYGON_BRIDGE_EXECUTOR_ADDRESS
      );

      const collectorController = Ownable__factory.connect(
        CONSTANTS.POLYGON.CONTROLLER_OF_COLLECTOR,
        user
      );
      expect(await collectorController.owner()).to.be.eq(
        CONSTANTS.POLYGON.POLYGON_BRIDGE_EXECUTOR_ADDRESS
      );
    });
  });
});
