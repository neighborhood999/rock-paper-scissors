const RockPaperScissors = artifacts.require('RockPaperScissors');

module.exports = (deployer, network, accounts) =>
  deployer.deploy(RockPaperScissors, { from: accounts[0] });

