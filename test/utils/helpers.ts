import { BigNumber, Signer } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { IERC20__factory, IAaveGovernanceV2 } from '../../types';

import { advanceBlocks, getCurrentBlock, setBlocktime } from '../../helpers/misc-utils';

export const ProposalStates = {
  PENDING: 0,
  CANCELED: 1,
  ACTIVE: 2,
  FAILED: 3,
  SUCCEEDED: 4,
  QUEUED: 5,
  EXPIRED: 6,
  EXECUTED: 7,
};

export type BalanceInfo = {
  [symbol: string]: BigNumber;
};

export const fetchBalances = async (
  tokenAddresses: string[],
  symbols: string[],
  signer: SignerWithAddress,
  user: string
) => {
  const balances: BalanceInfo = {};
  for (let i = 0; i < tokenAddresses.length; i++) {
    let symbol = symbols[i];
    balances[symbol] = await IERC20__factory.connect(tokenAddresses[i], signer).balanceOf(user);
  }
  return balances;
};

// enum ProposalState {Pending, Canceled, Active, Failed, Succeeded, Queued, Expired, Executed}
export const passVoteAndExecute = async (
  gov: IAaveGovernanceV2,
  voter: Signer,
  proposalId: BigNumber
) => {
  // Vote
  await advanceBlocks(1);
  await gov.connect(voter).submitVote(proposalId, true);

  // Advance after voting
  const endBlock = (await gov.getProposalById(proposalId)).endBlock;
  await advanceBlocks(endBlock.toNumber() - (await getCurrentBlock()) + 1);

  // Queue
  await gov.connect(voter).queue(proposalId);

  // Advance after execution time
  const executionTime = (await gov.getProposalById(proposalId)).executionTime;
  await setBlocktime(executionTime.toNumber() + 1);
  await advanceBlocks(1);

  // Execute
  const tx = await gov.connect(voter).execute(proposalId, { gasLimit: 30000000 });
  await tx.wait();

  return tx;
};
