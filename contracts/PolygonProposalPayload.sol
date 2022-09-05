// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.10;

import {IERC20} from './interfaces/IERC20.sol';
import {ICollectorController} from './interfaces/ICollectorController.sol';
import {IInitializableAdminUpgradeabilityProxy} from './interfaces/IInitializableAdminUpgradeabilityProxy.sol';
import {IProposalGenericExecutor} from './IProposalGenericExecutor.sol';

contract PolygonProposalPayload is IProposalGenericExecutor {
  address public constant AAVE_COMPANIES_ADDRESS = 0x48B9e6E865eBff2B76d9a85c10b7FA6772607F0b;

  ICollectorController public constant CONTROLLER_OF_COLLECTOR =
    ICollectorController(0xDB89487A449274478e984665b8692AfC67459deF);

  address public constant COLLECTOR_ADDRESS = 0x7734280A4337F37Fbf4651073Db7c28C80B339e9;
  address public constant COLLECTOR_ADDRESS_V3 = 0xe8599F3cc5D38a9aD6F3684cd5CEa72f10Dbc383;
  address public constant COLLECTOR_IMPLEMENTATION_ADDRESS =
    0xC773bf5a987b29DdEAC77cf1D48a22a4Ce5B0577;

  function execute() external override {
    // 1. Upgrade of Collector V2 and V3
    bytes memory initData = abi.encodeWithSignature('initialize(address)', CONTROLLER_OF_COLLECTOR);
    IInitializableAdminUpgradeabilityProxy(COLLECTOR_ADDRESS).upgradeToAndCall(
      COLLECTOR_IMPLEMENTATION_ADDRESS,
      initData
    );
    IInitializableAdminUpgradeabilityProxy(COLLECTOR_ADDRESS_V3).upgradeToAndCall(
      COLLECTOR_IMPLEMENTATION_ADDRESS,
      initData
    );

    // 2. Transfer Collector assets
    address[2] memory ASSETS_V2 = [
      0x8dF3aad3a84da6b69A4DA8aeC3eA40d9091B2Ac4, // amWMATIC
      0x5c2ed810328349100A66B82b78a1791B101C9D61 // amWBTC
    ];
    uint256[] memory ASSETS_V2_AMOUNTS = new uint256[](2);
    ASSETS_V2_AMOUNTS[0] = 850000000000000000000000; // 850000.000000000000000000 amWMATIC
    ASSETS_V2_AMOUNTS[1] = 1665609037; // 16.65609037 amWBTC

    for (uint256 i = 0; i < ASSETS_V2.length; i++) {
      CONTROLLER_OF_COLLECTOR.transfer(
        COLLECTOR_ADDRESS,
        IERC20(ASSETS_V2[i]),
        AAVE_COMPANIES_ADDRESS,
        ASSETS_V2_AMOUNTS[i]
      );
    }

    emit ProposalExecuted();
  }
}
