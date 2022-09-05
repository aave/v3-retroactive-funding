// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {IERC20} from './IERC20.sol';

interface ICollector {
  /**
   * @dev Retrieve the current implementation Revision of the proxy
   * @return The revision version
   */
  function REVISION() external view returns (uint256);

  /**
   * @dev Retrieve the current funds administrator
   * @return The address of the funds administrator
   */
  function getFundsAdmin() external view returns (address);
}
