import { task } from 'hardhat/config';
import { loadConfig } from '../helpers/config-loader';

task('submit-proposal', 'Submit a proposal').setAction(async ({}, _DRE: any) => {
  await _DRE.run('set-DRE');

  const network = _DRE.network.name;
  console.log('Network:', network);

  const {
    IPFS_HASH,
    ETHEREUM_PROPOSAL_PAYLOAD_ADDRESS,
    POLYGON_PROPOSAL_PAYLOAD_ADDRESS,
    AAVE_GOVERNANCE_ADDRESS,
    AAVE_SHORT_EXECUTOR_ADDRESS,
    POLYGON_BRIDGE_EXECUTOR_ADDRESS,
    POLYGON_FXROOT,
  } = await loadConfig();
  if (!IPFS_HASH || !ETHEREUM_PROPOSAL_PAYLOAD_ADDRESS) {
    throw new Error('The config file is incorrect, make sure to read the README.md');
  }

  await _DRE.run(`ethereum:submit`, {
    ethereumProposalPayloadAddress: ETHEREUM_PROPOSAL_PAYLOAD_ADDRESS,
    polygonProposalPayloadAddress: POLYGON_PROPOSAL_PAYLOAD_ADDRESS,
    aaveShortExecutorAddress: AAVE_SHORT_EXECUTOR_ADDRESS,
    aaveGovernanceAddress: AAVE_GOVERNANCE_ADDRESS,
    polygonBridgeExecutorAddress: POLYGON_BRIDGE_EXECUTOR_ADDRESS,
    polygonFxrootAddress: POLYGON_FXROOT,
    ipfsHash: IPFS_HASH,
  });
});
