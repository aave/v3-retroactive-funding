import { task } from 'hardhat/config';
import { PolygonProposalPayload__factory } from '../../types';
import { IAaveGovernanceV2 } from '../../types/IAaveGovernanceV2';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const bs58 = require('bs58');

task('only-ethereum:submit', 'Proposal submission')
  .addParam('ethereumProposalPayloadAddress')
  .addParam('aaveShortExecutorAddress')
  .addParam('aaveGovernanceAddress')
  .addParam('ipfsHash')
  .addOptionalParam('impersonateSignerAddress')
  .setAction(
    async (
      {
        ethereumProposalPayloadAddress,
        aaveShortExecutorAddress,
        aaveGovernanceAddress,
        ipfsHash,
        impersonateSignerAddress,
      },
      _DRE: any
    ) => {
      const { ethers } = _DRE;
      let proposer = (await ethers.getSigners())[0];

      if (impersonateSignerAddress) {
        console.log(`Impersonating ${impersonateSignerAddress}...`);
        proposer = await ethers.getSigner(impersonateSignerAddress);
      }
      console.log('Signer:', proposer.address);

      const executeSignature = 'execute()';
      const executeCallData = '0x';

      const gov = (await ethers.getContractAt(
        'IAaveGovernanceV2',
        aaveGovernanceAddress,
        proposer
      )) as IAaveGovernanceV2;

      const proposalId = await gov.getProposalsCount();

      const ipfsEncoded = `0x${bs58.decode(ipfsHash).slice(2).toString('hex')}`;
      const tx = await gov
        .connect(proposer)
        .populateTransaction.create(
          aaveShortExecutorAddress,
          [ethereumProposalPayloadAddress],
          ['0'],
          [executeSignature],
          [executeCallData],
          [true],
          ipfsEncoded
        );

      console.log('Your Proposal:', tx);
      console.log('ProposalId:', proposalId.toString());

      const receipt = await (await proposer.sendTransaction(tx)).wait();
      console.log('GasUsed:', receipt.gasUsed.toString());

      return proposalId.toString();
    }
  );

task('ethereum:submit', 'Proposal submission')
  .addParam('ethereumProposalPayloadAddress')
  .addParam('polygonProposalPayloadAddress')
  .addParam('aaveShortExecutorAddress')
  .addParam('aaveGovernanceAddress')
  .addParam('polygonBridgeExecutorAddress')
  .addParam('polygonFxrootAddress')
  .addParam('ipfsHash')
  .addOptionalParam('impersonateSignerAddress')
  .setAction(
    async (
      {
        ethereumProposalPayloadAddress,
        polygonProposalPayloadAddress,
        aaveShortExecutorAddress,
        aaveGovernanceAddress,
        polygonBridgeExecutorAddress,
        polygonFxrootAddress,
        ipfsHash,
        impersonateSignerAddress,
      },
      _DRE: any
    ) => {
      const { ethers } = _DRE;
      let proposer = (await ethers.getSigners())[0];

      if (impersonateSignerAddress) {
        console.log(`Impersonating ${impersonateSignerAddress}...`);
        proposer = await ethers.getSigner(impersonateSignerAddress);
      }
      console.log('Signer:', proposer.address);

      const executeSignature = 'execute()';
      const executeCallData = '0x';

      const gov = (await ethers.getContractAt(
        'IAaveGovernanceV2',
        aaveGovernanceAddress,
        proposer
      )) as IAaveGovernanceV2;

      const proposalId = await gov.getProposalsCount();

      // Polygon FxPortal call
      const polygonProposalPayload = PolygonProposalPayload__factory.connect(
        polygonProposalPayloadAddress,
        proposer
      );
      const encodedCalldata = polygonProposalPayload.interface.encodeFunctionData('execute');
      const encodedExecute = ethers.utils.defaultAbiCoder.encode(
        ['address[]', 'uint256[]', 'string[]', 'bytes[]', 'bool[]'],
        [[polygonProposalPayload.address], ['0'], [''], [encodedCalldata], [true]]
      );
      const sendMessageSignature = 'sendMessageToChild(address,bytes)';
      const sendMessageEncodedCalldata = ethers.utils.defaultAbiCoder.encode(
        ['address', 'bytes'],
        [polygonBridgeExecutorAddress, encodedExecute]
      );

      const ipfsEncoded = `0x${bs58.decode(ipfsHash).slice(2).toString('hex')}`;

      const tx = await gov
        .connect(proposer)
        .populateTransaction.create(
          aaveShortExecutorAddress,
          [ethereumProposalPayloadAddress, polygonFxrootAddress],
          ['0', '0'],
          [executeSignature, sendMessageSignature],
          [executeCallData, sendMessageEncodedCalldata],
          [true, false],
          ipfsEncoded
        );

      console.log('Your Proposal:', tx);
      console.log('ProposalId:', proposalId.toString());

      const receipt = await (await proposer.sendTransaction(tx)).wait();
      console.log('GasUsed:', receipt.gasUsed.toString());

      return proposalId.toString();
    }
  );
