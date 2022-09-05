import rawHRE, { ethers } from 'hardhat';
import { expect } from 'chai';
import { Signer } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import { loadConfig } from '../helpers/config-loader';
import { BalanceInfo, fetchBalances, passVoteAndExecute } from './utils/helpers';
import { getImpersonatedSigner, setBalance } from '../helpers/misc-utils';
import {
  IAaveGovernanceV2,
  IAaveGovernanceV2__factory,
  IERC20__factory,
  IERC20,
  EthereumProposalPayload__factory,
} from '../types';

import data from '../data.json';

const config = loadConfig();

// Address to user for the submission
const PROPOSER_ADDRESS = '0x25F2226B597E8F9514B3F68F00f494cF4f286491';

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
    // Aave Short Executor
    AAVE_SHORT_EXECUTOR_ADDRESS: config.AAVE_SHORT_EXECUTOR_ADDRESS,
    // AAVE Whale
    AAVE_WHALE_ADDRESS: '0x25F2226B597E8F9514B3F68F00f494cF4f286491',
  },
};

describe('Submits a proposal', () => {
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

    const config = await loadConfig();

    // Deploy proposal payload
    const proposalPayloadAddress = await rawHRE.run('deploy-ethereum-proposal-payload', {
      // Impersonating
      impersonateSignerAddress: await proposer.getAddress(),
    });
    const proposalPayload = await EthereumProposalPayload__factory.connect(
      proposalPayloadAddress,
      proposer
    );

    // Check receiver
    expect(await proposalPayload.AAVE_COMPANIES_ADDRESS()).to.be.eq(
      CONSTANTS.ETHEREUM.RECEIVER_ADDRESS
    );

    // Submit governance proposal
    const proposalId = await rawHRE.run('only-ethereum:submit', {
      proposalPayloadAddress,
      ethereumProposalPayloadAddress: proposalPayloadAddress,
      aaveShortExecutorAddress: CONSTANTS.ETHEREUM.AAVE_SHORT_EXECUTOR_ADDRESS,
      aaveGovernanceAddress: CONSTANTS.ETHEREUM.AAVE_GOVERNANCE_ADDRESS,
      ipfsHash: config.IPFS_HASH,
      // Impersonating
      impersonateSignerAddress: await proposer.getAddress(),
    });

    const aaveWhaleVoter = await getImpersonatedSigner(CONSTANTS.ETHEREUM.AAVE_WHALE_ADDRESS);
    await setBalance(CONSTANTS.ETHEREUM.AAVE_WHALE_ADDRESS, ethers.utils.parseEther('5'));

    const executionTx = await passVoteAndExecute(gov, aaveWhaleVoter, proposalId);
    expect(executionTx).to.emit(proposalPayload, 'ProposalExecuted');
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
      expect(receiverAfter[token]).to.be.closeTo(balances.receiver[token].add(amountToTransfer), 1);

      // Treasury: AfterBalance should be higher than BeforeBalance - amount
      expect(treasuryAfter[token]).to.be.gte(balances.treasury[token].sub(amountToTransfer));
    }
  });
});
