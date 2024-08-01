const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers  } = require("hardhat");
const { balanceOf } = require("./helpers/erc20");


const cfVaultAddress = "0x79001a5e762f3befc8e5871b42f6734e00498920";
const uniswapV3Factory = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
const NATIVE_TOKEN = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const WETH = "0x82af49447d8a07e3bd95bd0d56f35241523fbab1";
const USDC = "0xaf88d065e77c8cc2239327c5edb3a432268e5831"

async function setup(){
    const contract = await ethers.getContractFactory("TokenBeamRouter");
    const [deployer] = await ethers.getSigners();

    const router = await contract.deploy(deployer.address, WETH);
    
    await router.waitForDeployment();

    const connectorContract = await ethers.getContractFactory("UniswapV3Connector");
    const connector = await connectorContract.deploy(uniswapV3Factory);
    
    await connector.waitForDeployment();

    const routerAddress = await router.getAddress();
    const connectorAddress = await connector.getAddress();

    return { router, routerAddress, connectorAddress }
}

async function makeCalldata(receiver, tokenIn, tokenOut, executor) {
    return ethers.AbiCoder.defaultAbiCoder().encode(["address", "address", "address", "address"], [receiver, tokenIn, tokenOut, executor])
}

describe("Token Beam Router Tests", function(){

    describe("swapOut", function(){
        it("should swap native token", async function(){
            const { router, connectorAddress, routerAddress } = await loadFixture(setup);
            const [deployer] = await ethers.getSigners();
            const amountIn = ethers.parseEther("1")

            const desiredBalanceWei = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [amountIn])

            await ethers.provider.send("hardhat_setBalance", [routerAddress, desiredBalanceWei]);

            const calldata = makeCalldata(deployer.address, WETH, USDC, connectorAddress)
            
            const tokenOutBalanceStart = await balanceOf(USDC, deployer.address);

            await router.cfReceive(0, "0x", calldata, NATIVE_TOKEN, amountIn)

            const tokenOutBalanceEnd = await balanceOf(USDC, deployer.address);

            expect(tokenOutBalanceEnd).to.be.greaterThan(tokenOutBalanceStart);
        });
    });

    describe("swapIn", function(){
        it("should swap native token", async function(){
            const { router, connectorAddress, routerAddress } = await loadFixture(setup);
            const [deployer] = await ethers.getSigners();
            const amountIn = ethers.parseEther("1")

            const desiredBalanceWei = ethers.AbiCoder.defaultAbiCoder().encode(["uint256"], [amountIn])

            await ethers.provider.send("hardhat_setBalance", [routerAddress, desiredBalanceWei]);
            
            const tokenOutBalanceStart = await balanceOf(USDC, deployer.address);

            await router.swapIn(connectorAddress, WETH, USDC, deployer.address, amountIn);

            const tokenOutBalanceEnd = await balanceOf(USDC, deployer.address);

            expect(tokenOutBalanceEnd).to.be.greaterThan(tokenOutBalanceStart);
        });
    })

});