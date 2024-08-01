// SPDX-License-Identifier: MIT
pragma solidity >=0.4.0 <0.8.0;

interface ITokenBeamExchangeConnector {

    function swap(
        address tokenIn, 
        address tokenOut, 
        uint256 amountIn, 
        bool simulate, 
        address receiver
    ) external returns (uint256 amountOut, uint256 gasUsed);

    


}