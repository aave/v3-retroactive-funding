// SPDX-License-Identifier: AGPL-3.0
pragma solidity ^0.8.0;

interface IInitializableAdminUpgradeabilityProxy {
  function upgradeToAndCall(address newImplementation, bytes calldata data) external payable;

  function upgradeTo(address newImplementation) external payable;

  function admin() external returns (address);

  function implementation() external returns (address);

  function changeAdmin(address newAdmin) external;
}
