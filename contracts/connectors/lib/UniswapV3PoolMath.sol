// SPDX-License-Identifier: MIT
pragma solidity >=0.4.0 <0.8.0;
pragma abicoder v2;

import '@uniswap/v3-core/contracts/libraries/FullMath.sol';
import '@uniswap/v3-core/contracts/interfaces/pool/IUniswapV3PoolState.sol';
import '@uniswap/v3-core/contracts/interfaces/pool/IUniswapV3PoolImmutables.sol';

import '../../interfaces/IERC20.sol';

import 'hardhat/console.sol';

library UniswapV3PoolMath {

    function getUniswapV3SqrtX96Price(address pool) internal view returns (uint160) {
        (bool success,  bytes memory result) = pool.staticcall(abi.encodePacked(IUniswapV3PoolState.slot0.selector));

        require(success, "sqrtX96Price fail");

        uint160 sqrtX96Price = abi.decode(result, (uint160));

        return sqrtX96Price;
    }

    function getUniswapV3PoolSpotPrice(address pool, address tokenIn) internal view returns (uint256) {
        uint256 quote = getUniswapV3PoolQuote(pool);
        uint256 fee = IUniswapV3PoolImmutables(pool).fee();

        bool zeroToOne = IUniswapV3PoolImmutables(pool).token0() == tokenIn;

        uint256 spotPriceWithoutFee = zeroToOne ? quote : 1e36/quote;
        uint256 spotPriceWithFee = (spotPriceWithoutFee * (1e6-fee)) / 1e6;

        return spotPriceWithFee;
    }

    function getUniswapV3PoolQuote(address pool) internal view returns (uint256) {
        uint160 sqrtX96Price = getUniswapV3SqrtX96Price(pool);

        uint256 token0Decimals = IERC20(IUniswapV3PoolImmutables(pool).token0()).decimals();
        uint256 token1Decimals = IERC20(IUniswapV3PoolImmutables(pool).token1()).decimals();

        uint256 price = getPriceFromSqrtX96Price(sqrtX96Price, token0Decimals, token1Decimals);

        return price;
    }

    function getPriceFromSqrtX96Price(uint160 sqrtX96Price, uint256 token0Decimals, uint256 token1Decimals) internal pure returns (uint256) {
        return FullMath.mulDiv(uint256(sqrtX96Price) * uint256(sqrtX96Price), 10**token0Decimals, 1 << 192)* 10**(18-token1Decimals);
    }

}