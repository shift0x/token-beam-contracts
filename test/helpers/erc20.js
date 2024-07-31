const { AbiCoder } = require('ethers');

async function impersonateAddressAndTransferToken(token, owner, receiver, amount){
    const accountToImpersonate = owner;

    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [accountToImpersonate]
    });

    // Get the signer for the impersonated account
    const ownerSigner = await ethers.getSigner(accountToImpersonate);

    const tokenContract = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", token);

    // Ensure the owner has enough balance to send the transfer transaction
    const desiredBalanceWei = AbiCoder.defaultAbiCoder().encode(["uint256"], ["1000000000000000000"])
    
    await ethers.provider.send("hardhat_setBalance", [accountToImpersonate, desiredBalanceWei]);

    // transfer erc20 token to receiver
    await tokenContract.connect(ownerSigner).transfer(receiver, amount);
}

async function balanceOf(tokenAddress, account) {
    const token = await ethers.getContractAt("@openzeppelin/contracts/token/ERC20/IERC20.sol:IERC20", tokenAddress);
    const balance = await token.balanceOf(account);

    return balance;
}

module.exports = {
    impersonateAddressAndTransferToken,
    balanceOf
}