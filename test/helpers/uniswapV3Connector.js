const { ethers } = require("hardhat");

async function getOptimalPoolForSwap(connector, tokenIn, tokenOut){
    const result = await connector.findOptimalPoolForSwap(tokenIn, tokenOut);
    const model = {
        pools: [],
        optimalPool: result[2]
    }

    model.pools = result[0].map((address,index) => {
        return { 
            pool: address,
            spot: parseFloat(result[1][index]) / 10**18
        }
    })

    model.actualOptimalPool = model.pools.sort((x,y) => {
        return x.spot < y.spot ? 1 : -1
    })[0].pool;

    return model;
}

async function simulateSwap(connector, tokenIn, tokenOut, amountIn){
    const connectorAddress = await connector.getAddress();
    const calldata = connector.interface.encodeFunctionData("swap", [tokenIn, tokenOut, amountIn, true, connectorAddress]);
    const [deployer] = await ethers.getSigners();

    const resultBytes = await deployer.call({ to: connectorAddress, data: calldata })
    const result = connector.interface.decodeFunctionResult("swap", resultBytes);

    return {
        amountOut: result[0],
        gasUsed: result[1]
    }
}

module.exports = {
    getOptimalPoolForSwap,
    simulateSwap
}