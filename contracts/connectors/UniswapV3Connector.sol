// SPDX-License-Identifier: MIT
pragma solidity >=0.4.0 <0.8.0;
pragma abicoder v2;

import '@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol';
import '@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol';
import '@uniswap/v3-core/contracts/interfaces/pool/IUniswapV3PoolImmutables.sol';
import '@uniswap/v3-core/contracts/interfaces/pool/IUniswapV3PoolActions.sol';
import '@uniswap/v3-core/contracts/libraries/SafeCast.sol';

import './lib/UniswapV3PoolMath.sol';

import './interfaces/ITokenBeamExchangeConnector.sol';

import 'hardhat/console.sol';

contract UniswapV3Connector is ITokenBeamExchangeConnector {
    using SafeCast for uint256;

    uint160 private constant MIN_SQRT_RATIO = 4295128739;
    uint160 private constant MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342;

    address private immutable _uniswapV3Factory;
    
    constructor(
        address uniswapV3Factory
    ){
        _uniswapV3Factory = uniswapV3Factory;
    }

    function swap(
        address tokenIn, 
        address tokenOut, 
        uint256 amountIn, 
        bool simulate, 
        address receiver
    ) public override returns (uint256 amountOut, uint256 gasUsed) {
        uint256 startingGas = gasleft();

        (,,address bestPool) = findOptimalPoolForSwap(tokenIn, tokenOut);

        require(bestPool != address(0), "unsupported route");

        (,amountOut) = _swapWithPool(bestPool, tokenIn, tokenOut, amountIn, simulate, receiver);

        gasUsed = startingGas - gasleft();
    }

    function findOptimalPoolForSwap(
        address tokenIn, 
        address tokenOut
    ) public view returns (address[] memory pools, uint256[] memory prices, address poolWithBestSpotPrice) {
        uint24[] memory feeAmounts = _getUniswapV3PoolFeeAmounts();
        IUniswapV3Factory factory = IUniswapV3Factory(_uniswapV3Factory);
        
        pools = new address[](feeAmounts.length);
        prices = new uint256[](feeAmounts.length);

        address pool;
        uint256 spotPrice;
        uint256 bestSpotPrice;

        for(uint256 i=0; i<feeAmounts.length; ++i){
            pool = factory.getPool(tokenIn, tokenOut, feeAmounts[i]);

            if(pool == address(0)){ continue; }

            spotPrice = UniswapV3PoolMath.getUniswapV3PoolSpotPrice(pool, tokenIn);

            pools[i] = pool;
            prices[i] = spotPrice;

            if(spotPrice > bestSpotPrice) {
                poolWithBestSpotPrice = pool;
                bestSpotPrice = spotPrice;
            }
        }
    }

    function uniswapV3SwapCallback(
        int256 amount0Delta, 
        int256 amount1Delta, 
        bytes memory path
    ) external {
        (address tokenIn, address tokenOut, uint24 fee, bool simulate) = abi.decode(path, (address, address, uint24, bool));

        address expectedCaller = IUniswapV3Factory(_uniswapV3Factory).getPool(tokenIn, tokenOut, fee);

        require(msg.sender == expectedCaller, "unauthorized");

        (uint256 amountToPay, uint256 amountReceived) =
            amount0Delta > 0
                ? (uint256(amount0Delta), uint256(-amount1Delta))
                : (uint256(amount1Delta), uint256(-amount0Delta));

        if(simulate) {
            _raise(abi.encode(amountToPay, amountReceived));
        }

        IERC20(tokenIn).transfer(msg.sender, amountToPay);
    }

    function _swapWithPool(
        address pool, 
        address tokenIn, 
        address tokenOut, 
        uint256 amountIn, 
        bool simulate, 
        address receiver
    ) private returns (uint256 actualAmountIn, uint256 actualAmountOut) {
        bool zeroForOne = IUniswapV3PoolImmutables(pool).token0() == tokenIn;
        uint24 fee = IUniswapV3PoolImmutables(pool).fee();
        
        bytes memory callbytes = abi.encodeWithSelector(IUniswapV3PoolActions.swap.selector, 
                receiver, 
                zeroForOne,  
                amountIn.toInt256(), 
                zeroForOne ? MIN_SQRT_RATIO + 1 : MAX_SQRT_RATIO - 1, 
                abi.encode(tokenIn, tokenOut, fee, simulate));


        (bool success, bytes memory data) = pool.call(callbytes);

        if(success){
            (int256 amount0Delta, int256 amount1Delta) = abi.decode(data, (int256, int256));

            (actualAmountIn, actualAmountOut) =
                amount0Delta > 0
                    ? (uint256(amount0Delta), uint256(-amount1Delta))
                    : (uint256(amount1Delta), uint256(-amount0Delta));
        } else {
            (actualAmountIn, actualAmountOut) = abi.decode(data, (uint256, uint256));
        }
    }

    function _getUniswapV3PoolFeeAmounts() private pure returns (uint24[] memory amounts) {
        amounts = new uint24[](4);
        amounts[0] = 100;
        amounts[1] = 500;
        amounts[2] = 3000;
        amounts[3] = 10000;
    }

    function _raise(
        bytes memory data
    ) private pure {
        assembly {
            let size := mload(data)
            revert(add(32, data), size)
        }
    }
}