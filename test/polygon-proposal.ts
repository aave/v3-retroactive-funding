import rawHRE from 'hardhat';
import { expect } from 'chai';
import { BigNumber, Signer } from 'ethers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

import { getImpersonatedSigner, setBalance } from '../helpers/misc-utils';
import { BalanceInfo, fetchBalances } from './utils/helpers';

import {
  PolygonProposalPayload__factory,
  InitializableAdminUpgradeabilityProxy__factory,
  PolygonBridgeExecutor__factory,
  IInitializableAdminUpgradeabilityProxy__factory,
  Ownable__factory,
  ICollector__factory,
} from '../types';

import data from '../data.json';

// POLYGON
// Receiver address
const POLYGON_RECEIVER_ADDRESS = '0x48B9e6E865eBff2B76d9a85c10b7FA6772607F0b';
// Collector address
const POLYGON_COLLECTOR_ADDRESS = '0x7734280A4337F37Fbf4651073Db7c28C80B339e9';
const POLYGON_COLLECTOR_IMPLEMENTATION_ADDRESS = '0xC773bf5a987b29DdEAC77cf1D48a22a4Ce5B0577';
const POLYGON_CONTROLLER_OF_COLLECTOR = '0xDB89487A449274478e984665b8692AfC67459deF';

const POLYGON_BRIDGE_EXECUTOR_ADDRESS = '0xdc9A35B16DB4e126cFeDC41322b3a36454B1F772';

describe('Runs Polygon proposal', () => {
  let user: SignerWithAddress;

  let spoof: Signer;
  let multisigSpoof: Signer;

  const balances = {
    treasury: {} as BalanceInfo,
    receiver: {} as BalanceInfo,
  };

  before(async () => {
    await rawHRE.run('set-DRE');

    console.log('Network:', rawHRE.network.name);

    [user] = await rawHRE.ethers.getSigners();

    spoof = await getImpersonatedSigner(POLYGON_BRIDGE_EXECUTOR_ADDRESS);
    multisigSpoof = await getImpersonatedSigner('0xbb2f3ba4a63982ed6d93c190c28b15cbba0b6af3');

    await setBalance(await spoof.getAddress(), BigNumber.from('0x8AC7230489E80000'));
    await setBalance(await multisigSpoof.getAddress(), BigNumber.from('0x8AC7230489E80000'));
  });

  it('Fetch receiver balances', async () => {
    // Polygon
    const aTokenAddresses = data.polygon.map((a) => a.aToken);
    const symbols = data.polygon.map((a) => a.symbol);
    balances.receiver = await fetchBalances(
      aTokenAddresses,
      symbols,
      user,
      POLYGON_RECEIVER_ADDRESS
    );
    balances.treasury = await fetchBalances(
      aTokenAddresses,
      symbols,
      user,
      POLYGON_COLLECTOR_ADDRESS
    );
  });

  it('Transfers ownership of AaveCollector to PolygonBridgeExecutor', async () => {
    const collectorProxy = InitializableAdminUpgradeabilityProxy__factory.connect(
      POLYGON_COLLECTOR_ADDRESS,
      multisigSpoof
    );

    expect(
      await collectorProxy.connect(multisigSpoof).changeAdmin(POLYGON_BRIDGE_EXECUTOR_ADDRESS)
    );

    expect(await collectorProxy.connect(spoof).callStatic.admin()).to.be.eq(
      await spoof.getAddress()
    );
  });

  it('Executes payload', async () => {
    const collectorImple = ICollector__factory.connect(
      POLYGON_COLLECTOR_IMPLEMENTATION_ADDRESS,
      user
    );
    expect(await collectorImple.REVISION()).to.be.eq(2);

    // Deploy proposal payload
    const proposalPayloadAddress = await rawHRE.run('deploy-polygon-proposal-payload');
    const proposalPayload = await PolygonProposalPayload__factory.connect(
      proposalPayloadAddress,
      user
    );

    // Check receiver
    expect(await proposalPayload.AAVE_COMPANIES_ADDRESS()).to.be.eq(POLYGON_RECEIVER_ADDRESS);

    // Execution
    const polygonBridge = await PolygonBridgeExecutor__factory.connect(
      POLYGON_BRIDGE_EXECUTOR_ADDRESS,
      spoof
    );
    await polygonBridge
      .connect(spoof)
      .executeDelegateCall(
        proposalPayload.address,
        proposalPayload.interface.encodeFunctionData('execute'),
        { gasLimit: 30000000 }
      );
  });

  it('Check balances', async () => {
    const aTokenAddresses = data.polygon.map((a) => a.aToken);
    const symbols = data.polygon.map((a) => a.symbol);
    const receiverAfter = await fetchBalances(
      aTokenAddresses,
      symbols,
      user,
      POLYGON_RECEIVER_ADDRESS
    );
    const treasuryAfter = await fetchBalances(
      aTokenAddresses,
      symbols,
      user,
      POLYGON_COLLECTOR_ADDRESS
    );

    const findAmountToTransfer = (symbol: string) => {
      return data.polygon.find((item) => item.symbol == symbol)?.fullAmount || 0;
    };

    const findDecimals = (symbol: string) => {
      return data.polygon.find((item) => item.symbol == symbol)?.decimals || 18;
    };

    for (let i = 0; i < Object.keys(receiverAfter).length; i++) {
      const token = Object.keys(receiverAfter)[i];

      let amountToTransfer = findAmountToTransfer(token);

      // Receiver: AfterBalance should be BeforeBalance + amount
      expect(receiverAfter[token]).to.be.closeTo(balances.receiver[token].add(amountToTransfer), 1);

      // Treasury: AfterBalance should be higher than BeforeBalance - amount
      expect(treasuryAfter[token]).to.be.gte(balances.treasury[token].sub(amountToTransfer));
    }
  });

  it('Check owners', async () => {
    const collector = ICollector__factory.connect(POLYGON_COLLECTOR_ADDRESS, user);
    expect(await collector.getFundsAdmin()).to.be.eq(POLYGON_CONTROLLER_OF_COLLECTOR);

    const collectorProxy = IInitializableAdminUpgradeabilityProxy__factory.connect(
      POLYGON_COLLECTOR_ADDRESS,
      spoof
    );
    expect(await collectorProxy.callStatic.admin()).to.be.eq(POLYGON_BRIDGE_EXECUTOR_ADDRESS);

    const collectorController = Ownable__factory.connect(POLYGON_CONTROLLER_OF_COLLECTOR, user);
    expect(await collectorController.owner()).to.be.eq(POLYGON_BRIDGE_EXECUTOR_ADDRESS);
  });
});
