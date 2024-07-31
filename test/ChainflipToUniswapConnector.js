const ChainflipToUniswapConnectorHelper = require('./helpers/chainflipToUniswapConnector');
const ERC20Helper = require('./helpers/erc20');

const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers  } = require("hardhat");


const uniswapV3Factory = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
const WETH = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
const USDC = "0xaf88d065e77c8cc2239327c5edb3a432268e5831"
const WETH_WBTC_POOL = "0x2f5e87C9312fa29aed5c179E456625D79015299c"

async function setup(){
    // build the inital set of default quoters. These can be overriden later by the admin
    const contract = await ethers.getContractFactory("ChainflipToUniswapV3Connector");
    
    const connector = await contract.deploy(uniswapV3Factory, WETH);
    
    await connector.waitForDeployment();

    return { connector }
}

describe("Chainflip To Uniswap Connector Tests", function(){

    describe("security", function(){

        it("should revert calls to uniswapV3Fallback from unexpected senders", async function(){
            const { connector } = await loadFixture(setup);
            const encodedCallbackBytes = ethers.AbiCoder.defaultAbiCoder().encode(["address", "address", "uint24", "bool"], [WETH, USDC, 500, true]);
            
            await expect(connector.uniswapV3SwapCallback(0,0, encodedCallbackBytes)).is.revertedWith("unauthorized");
        });
        
    })

    describe("swap", function(){
        it("should choose pool with best spot price as optimal pool", async function(){
            const { connector } = await loadFixture(setup);
            const result = await ChainflipToUniswapConnectorHelper.getOptimalPoolForSwap(connector, USDC, WETH);
            
            expect(result.actualOptimalPool).is.equal(result.optimalPool);
        });

        it("should return empty values when pools are not found for fee amounts", async function(){
            const { connector } = await loadFixture(setup);
            const dummyTokenAddress = "0x0000000000000000000000000000000000000111"
            const result = await ChainflipToUniswapConnectorHelper.getOptimalPoolForSwap(connector, dummyTokenAddress, USDC);

            result.pools.forEach(pool => {
                expect(pool.pool).is.equal("0x0000000000000000000000000000000000000000");
                expect(pool.spot).is.equal(0);
            });
        });

        it("should throw unsupported route error when optimal swap pool is not found", async function(){
            const { connector } = await loadFixture(setup);
            const dummyTokenAddress = "0x0000000000000000000000000000000000000111"
            const amountIn = ethers.parseEther("1");
            const simulate = true;

            await expect(connector.swap(dummyTokenAddress, USDC, amountIn, simulate)).is.revertedWith("unsupported route")
        })

        it("should simulate swap between tokens", async function(){
            const { connector } = await loadFixture(setup);
            const amountIn = ethers.parseEther("1");

            const result = await ChainflipToUniswapConnectorHelper.simulateSwap(connector, WETH, USDC, amountIn)

            expect(result.amountOut).is.greaterThan(0);
            expect(result.gasUsed).is.greaterThan(0);
        })

        it("should swap between tokens", async function(){
            const { connector } = await loadFixture(setup);
            const amountIn = ethers.parseEther("1");
            const connectorAddress = await connector.getAddress();

            await ERC20Helper.impersonateAddressAndTransferToken(WETH, WETH_WBTC_POOL, connectorAddress, amountIn);

            const tokenInStartingBalance = await ERC20Helper.balanceOf(WETH, connectorAddress);
            const tokenOutStartingBalance = await ERC20Helper.balanceOf(USDC, connectorAddress);

            expect(tokenInStartingBalance).is.equal(amountIn);
            expect(tokenOutStartingBalance).is.equal(0);

            await connector.swap(WETH, USDC, amountIn, false);

            const tokenInEndingBalance = await ERC20Helper.balanceOf(WETH, connectorAddress);
            const tokenOutEndingBalance = await ERC20Helper.balanceOf(USDC, connectorAddress);

            expect(tokenInEndingBalance).is.equal(0);
            expect(tokenOutEndingBalance).is.greaterThan(0);
        })
    })

})