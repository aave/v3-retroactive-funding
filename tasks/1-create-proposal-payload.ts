import { task } from 'hardhat/config';

task('create-ethereum-proposal-payload', 'Create a proposal payload').setAction(
  async ({}, _DRE: any) => {
    await _DRE.run('set-DRE');

    const network = _DRE.network.name;
    console.log('Network:', network);

    await _DRE.run(`deploy-ethereum-proposal-payload`);
  }
);

task('create-polygon-proposal-payload', 'Create a proposal payload').setAction(
  async ({}, _DRE: any) => {
    await _DRE.run('set-DRE');

    const network = _DRE.network.name;
    console.log('Network:', network);

    await _DRE.run(`deploy-polygon-proposal-payload`);
  }
);
