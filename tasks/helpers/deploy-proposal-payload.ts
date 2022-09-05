import { task } from 'hardhat/config';
import { PolygonProposalPayload__factory, EthereumProposalPayload__factory } from '../../types';

task('deploy-ethereum-proposal-payload', 'Deploy the proposal payload')
  .addOptionalParam('impersonateSignerAddress')
  .setAction(async ({ impersonateSignerAddress }, _DRE: any) => {
    const { ethers } = _DRE;
    let proposer = (await ethers.getSigners())[0];

    if (impersonateSignerAddress) {
      console.log(`Impersonating ${impersonateSignerAddress}...`);
      proposer = await ethers.getSigner(impersonateSignerAddress);
    }
    console.log('Signer:', proposer.address);

    const payload = await new EthereumProposalPayload__factory(proposer).deploy();
    await payload.deployTransaction.wait();

    // verify
    console.log('Payload deployed at:', payload.address);

    return payload.address;
  });

task('deploy-polygon-proposal-payload', 'Deploy the proposal payload')
  .addOptionalParam('impersonateSignerAddress')
  .setAction(async ({ impersonateSignerAddress }, _DRE: any) => {
    const { ethers } = _DRE;
    let proposer = (await ethers.getSigners())[0];

    if (impersonateSignerAddress) {
      console.log(`Impersonating ${impersonateSignerAddress}...`);
      proposer = await ethers.getSigner(impersonateSignerAddress);
    }
    console.log('Signer:', proposer.address);

    const payload = await new PolygonProposalPayload__factory(proposer).deploy();
    await payload.deployTransaction.wait();

    // verify
    console.log('Payload deployed at:', payload.address);

    return payload.address;
  });
