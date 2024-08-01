// SPDX-License-Identifier: MIT
pragma solidity >=0.4.0 <0.8.0;

import './connectors/interfaces/ITokenBeamExchangeConnector.sol';
import './interfaces/IWETH.sol';
import './interfaces/IERC20.sol';
import './interfaces/ITokenBeamRouter.sol';

contract TokenBeamRouter is ITokenBeamRouter {
    address constant private NATIVE_TOKEN = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    address immutable public _cfVault;
    address immutable public _weth;

    constructor(
        address cfVault, 
        address weth
    ) {
        _cfVault = cfVault;
        _weth = weth;
    }    

    function cfReceive(
        uint32 srcChain,
        bytes calldata srcAddress,
        bytes calldata message,
        address token,
        uint256 amount
    ) external payable {
        require(msg.sender == _cfVault, "CFReceiver: caller not CF Vault");

        try ITokenBeamRouter(address(this)).swapOut(token, amount, message)
        {} catch(bytes memory){
            address payable receiver = abi.decode(message, (address));

            if(token == NATIVE_TOKEN){
                receiver.transfer(amount);
            } else {
                IERC20(token).transfer(receiver, amount);
            }
        }
    }

    function swapOut(
        address token, 
        uint256 amount, 
        bytes memory message
    ) external override {
        (address receiver, address tokenIn, address tokenOut, address executor) = abi.decode(message, (address, address, address, address));

        if(tokenIn == _weth){
            IWETH(_weth).withdraw(amount);
        } else {
            require(token == tokenIn, "TokenBeamRouter: unexpected input token");
        }

        IERC20(tokenIn).transfer(executor, amount);

        ITokenBeamExchangeConnector(executor).swap(tokenIn, tokenOut, amount, false, receiver);
    }

    function swapIn(
        address executor, 
        address tokenIn, 
        address tokenOut, 
        address receiver, 
        uint256 amountIn
    ) external override payable {

        if(tokenIn == _weth){
            require(msg.value == amountIn, "TokenBeamRouter: unexpected input amount");

            IWETH(_weth).withdraw(amountIn);
            IERC20(_weth).transfer(executor, amountIn);
        } else {
            IERC20(tokenIn).transferFrom(msg.sender, executor, amountIn);
        }

        ITokenBeamExchangeConnector(executor).swap(tokenIn, tokenOut, amountIn, false, receiver);
    }
}