// SPDX-License-Identifier: MIT
pragma solidity >=0.4.0 <0.8.0;

interface ITokenBeamRouter {
    function swapOut(address token, uint256 amount, bytes memory message) external;
    function swapIn(address executor, address tokenIn, address tokenOut, address receiver, uint256 amountIn) external payable;
}