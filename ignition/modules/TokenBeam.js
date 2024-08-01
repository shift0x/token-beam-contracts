const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("TokenBeam", (m) => {
    const router = m.contract("TokenBeamRouter", [m.getParameter("cfVault"), m.getParameter("weth")])
    //const uniswapV3Connector = m.contract("UniswapV3Connector", [m.getParameter("uniswapV3Factory")])

    return { router };
});
