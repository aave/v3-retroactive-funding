import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { Wallet, BigNumber, Signer } from 'ethers';

export let DRE: HardhatRuntimeEnvironment;

export const setDRE = (_DRE: HardhatRuntimeEnvironment) => {
  DRE = _DRE;
};

export const getCurrentBlock = async () => {
  return (await DRE.ethers.provider.getBlock('latest')).number;
};

export const timeLatest = async () => {
  const block = await DRE.ethers.provider.getBlock('latest');
  return BigNumber.from(block.timestamp);
};

export const setBlocktime = async (time: number) => {
  await DRE.ethers.provider.send('evm_setNextBlockTimestamp', [time]);
};

export const advanceBlocks = async (numberOfBlocks: number, timeBetweenBlocks: number = 0) =>
  await DRE.ethers.provider.send('hardhat_mine', [
    `0x${numberOfBlocks.toString(16)}`,
    `0x${timeBetweenBlocks.toString(16)}`,
  ]);

export const increaseTime = async (secondsToIncrease: number) => {
  await DRE.ethers.provider.send('evm_increaseTime', [secondsToIncrease]);
  await DRE.ethers.provider.send('evm_mine', []);
};

// Workaround for time travel tests bug: https://github.com/Tonyhaenn/hh-time-travel/blob/0161d993065a0b7585ec5a043af2eb4b654498b8/test/test.js#L12
export const advanceTimeAndBlock = async function (forwardTime: number) {
  const currentBlockNumber = await getCurrentBlock();
  const currentBlock = await DRE.ethers.provider.getBlock(currentBlockNumber);

  if (currentBlock === null) {
    /* Workaround for https://github.com/nomiclabs/hardhat/issues/1183
     */
    await DRE.ethers.provider.send('evm_increaseTime', [forwardTime]);
    await DRE.ethers.provider.send('evm_mine', []);
    //Set the next blocktime back to 15 seconds
    await DRE.ethers.provider.send('evm_increaseTime', [15]);
    return;
  }
  const currentTime = currentBlock.timestamp;
  const futureTime = currentTime + forwardTime;
  await DRE.ethers.provider.send('evm_setNextBlockTimestamp', [futureTime]);
  await DRE.ethers.provider.send('evm_mine', []);
};

export const setAutomine = async (activate: boolean) => {
  await DRE.network.provider.send('evm_setAutomine', [activate]);
  if (activate) await DRE.network.provider.send('evm_mine', []);
};

export const setAutomineEvm = async (activate: boolean) => {
  await DRE.network.provider.send('evm_setAutomine', [activate]);
};

export const impersonateAccountsHardhat = async (accounts: string[]) => {
  if (process.env.TENDERLY === 'true') {
    return;
  }
  // eslint-disable-next-line no-restricted-syntax
  for (const account of accounts) {
    // eslint-disable-next-line no-await-in-loop
    await DRE.network.provider.request({
      method: 'hardhat_impersonateAccount',
      params: [account],
    });
  }
};

export const getImpersonatedSigner = async (address: string): Promise<Signer> => {
  await DRE.network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [address],
  });
  return await DRE.ethers.getSigner(address);
};

export const setBalance = async (account: string, balance: BigNumber) => {
  if (DRE.network.name === 'hardhat') {
    await DRE.network.provider.send('hardhat_setBalance', [account, balance.toHexString()]);
  }
};
