// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/CrawlPayFacilitator.sol";

contract Deploy is Script {
    // USDC on Pharos Atlantic Testnet
    address constant USDC = 0xE0BE08c77f415F577A1B3A9aD7a1Df1479564ec8;

    function run() external {
        vm.startBroadcast();
        CrawlPayFacilitator facilitator = new CrawlPayFacilitator(USDC);
        console.log("CrawlPayFacilitator deployed at:", address(facilitator));
        vm.stopBroadcast();
    }
}
