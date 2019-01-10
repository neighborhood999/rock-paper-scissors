import { expect } from 'chai';
import web3Utils from 'web3-utils';
import { default as Promise } from 'bluebird';
import expectedException from '../utils/expectedException';

const RockPaperScissors = artifacts.require('RockPaperScissors');

const getTxEvent1stLog = ({ logs: [log] }) => log;

if (typeof web3.eth.getBlockPromise !== 'function') {
  Promise.promisifyAll(web3.eth, { suffix: 'Promise' });
}

contract('RockPaperScissors', accounts => {
  const [alice, bob, carol] = accounts;
  const aliceSecret = 'aliceSecret';
  const PLAYER1_MAX_BLOCK = 9;
  const PLAYER2_MAX_BLOCK = 7;
  const MOVE = {
    NONE: 0,
    ROCK: 1,
    PAPER: 2,
    SCISSORS: 3
  };

  let rps;
  beforeEach('deploy new instance', async () => {
    rps = await RockPaperScissors.new({ from: alice });
  });

  describe('start function', () => {
    it('should fail if the move1 hash equals 0', async () => {
      const value = web3Utils.toWei('0.01', 'ether');

      await expectedException(() =>
        rps.startGame('0x0', bob, PLAYER1_MAX_BLOCK, PLAYER2_MAX_BLOCK, { from: alice, value })
      );
    });

    it('should fail if the player2 address equals 0', async () => {
      const value = web3Utils.toWei('0.01', 'ether');
      const gameHash = await rps.hash(alice, MOVE.ROCK, aliceSecret, {
        from: alice
      });

      await expectedException(() =>
        rps.startGame(gameHash, '0x0', PLAYER1_MAX_BLOCK, PLAYER2_MAX_BLOCK, { from: alice, value })
      );
    });

    it('should fail if the msg.value equals 0', async () => {
      const value = web3Utils.toWei('0', 'ether');
      const gameHash = await rps.hash(alice, MOVE.ROCK, aliceSecret, {
        from: alice
      });

      await expectedException(() =>
        rps.startGame(gameHash, bob, PLAYER1_MAX_BLOCK, PLAYER2_MAX_BLOCK, { from: alice, value })
      );
    });

    it('should fail player1MaxBlock equals 0', async () => {
      const value = web3Utils.toWei('0.01', 'ether');
      const gameHash = await rps.hash(alice, MOVE.ROCK, aliceSecret, {
        from: alice
      });

      await expectedException(() =>
        rps.startGame(gameHash, bob, 0, PLAYER2_MAX_BLOCK, { from: alice, value })
      );
    });

    it('should fail player2MaxBlock equals 0', async () => {
      const value = web3Utils.toWei('0.01', 'ether');
      const gameHash = await rps.hash(alice, MOVE.ROCK, aliceSecret, {
        from: alice
      });

      await expectedException(() =>
        rps.startGame(gameHash, bob, PLAYER1_MAX_BLOCK, 0, { from: alice, value })
      );
    });

    it('should start the game', async () => {
      const value = web3Utils.toWei('0.01', 'ether');
      const gameHash = await rps.hash(alice, MOVE.ROCK, aliceSecret, {
        from: alice
      });
      const tx = await rps.startGame(gameHash, bob, PLAYER1_MAX_BLOCK, PLAYER2_MAX_BLOCK, { from: alice, value });

      const log = getTxEvent1stLog(tx);
      expect(log.event).to.equal('LogGameCreated');
      expect(log.args.player1).to.equal(alice);
      expect(log.args.player2).to.equal(bob);
      expect(log.args.price.toString(10)).to.equal(value.toString(10));
    });

    it('should fail if the game already started', async () => {
      const value = web3Utils.toWei('0.01', 'ether');
      const gameHash = await rps.hash(alice, MOVE.ROCK, aliceSecret, {
        from: alice
      });

      await rps.startGame(gameHash, bob, PLAYER1_MAX_BLOCK, PLAYER2_MAX_BLOCK, { from: alice, value })
      await expectedException(() =>
        rps.startGame(gameHash, bob, PLAYER1_MAX_BLOCK, PLAYER2_MAX_BLOCK, { from: alice, value })
      );
    });
  });

  describe('joinGame function', () => {
    it('should fail if move2 equals NONE', async () => {
      const value = web3Utils.toWei('0.01', 'ether');
      const gameHash = await rps.hash(alice, MOVE.ROCK, aliceSecret, {
        from: alice
      });

      await rps.startGame(gameHash, bob, PLAYER1_MAX_BLOCK, PLAYER2_MAX_BLOCK, { from: alice, value });
      await expectedException(() =>
        rps.joinGame(gameHash, MOVE.NONE, { from: bob, value })
      );
    });

    it('should fail if player address is invalid', async () => {
      const value = web3Utils.toWei('0.01', 'ether');
      const gameHash = await rps.hash(alice, MOVE.ROCK, aliceSecret, {
        from: alice
      });

      await rps.startGame(gameHash, bob, PLAYER1_MAX_BLOCK, PLAYER2_MAX_BLOCK, { from: alice, value });
      await expectedException(() =>
        rps.joinGame(gameHash, MOVE.ROCK, { from: carol, value })
      );
    });

    it('should fail if move2 not to equals NONE', async () => {
      const value = web3Utils.toWei('0.01', 'ether');
      const gameHash = await rps.hash(alice, MOVE.ROCK, aliceSecret, {
        from: alice
      });

      await rps.startGame(gameHash, bob, PLAYER1_MAX_BLOCK, PLAYER2_MAX_BLOCK, { from: alice, value });
      await rps.joinGame(gameHash, MOVE.ROCK, { from: bob, value });
      await expectedException(() =>
        rps.joinGame(gameHash, MOVE.ROCK, { from: bob, value })
      );
    });

    it('should join the game', async () => {
      const value = web3Utils.toWei('0.01', 'ether');
      const gameHash = await rps.hash(alice, MOVE.ROCK, aliceSecret, {
        from: alice
      });

      await rps.startGame(gameHash, bob, PLAYER1_MAX_BLOCK, PLAYER2_MAX_BLOCK, { from: alice, value });
      const tx = await rps.joinGame(gameHash, MOVE.PAPER, { from: bob, value });
      const log = getTxEvent1stLog(tx);

      expect(log.event).to.equal('LogGameJoined');
      expect(log.args.player1).to.equal(alice);
      expect(log.args.player2).to.equal(bob);
      expect(log.args.gameHash).to.equal(gameHash);
      expect(log.args.move2.toNumber()).to.equal(MOVE.PAPER);
    });
  });

  describe('gameResult function', () => {
    it('should fail if game hash equals 0', async () => {
      const value = web3Utils.toWei('0.01', 'ether');
      const gameHash = await rps.hash(alice, MOVE.ROCK, aliceSecret, {
        from: alice
      });

      await rps.startGame(gameHash, bob, PLAYER1_MAX_BLOCK, PLAYER2_MAX_BLOCK, { from: alice, value });
      await rps.joinGame(gameHash, MOVE.ROCK, { from: bob, value });
      await expectedException(() =>
        rps.gameResult('0x0', MOVE.ROCK, aliceSecret, { from: alice })
      );
    });

    it('should fail if move1 equals NONE', async () => {
      const value = web3Utils.toWei('0.01', 'ether');
      const gameHash = await rps.hash(alice, MOVE.ROCK, aliceSecret, {
        from: alice
      });

      await rps.startGame(gameHash, bob, PLAYER1_MAX_BLOCK, PLAYER2_MAX_BLOCK, { from: alice, value });
      await rps.joinGame(gameHash, MOVE.ROCK, { from: bob, value });
      await expectedException(() =>
        rps.gameResult(gameHash, MOVE.NONE, aliceSecret, { from: alice })
      );
    });


    it('should fail if move is invalid', async () => {
      const value = web3Utils.toWei('0.01', 'ether');
      const gameHash = await rps.hash(alice, MOVE.ROCK, aliceSecret, {
        from: alice
      });

      await rps.startGame(gameHash, bob, PLAYER1_MAX_BLOCK, PLAYER2_MAX_BLOCK, { from: alice, value });
      await expectedException(() =>
        rps.gameResult(gameHash, MOVE.ROCK, aliceSecret, { from: alice })
      );
    });

    it('should fail if move1Hash is invalid', async () => {
      const value = web3Utils.toWei('0.01', 'ether');
      const gameHash = await rps.hash(alice, MOVE.PAPER, aliceSecret, {
        from: alice
      });

      await rps.startGame(gameHash, bob, PLAYER1_MAX_BLOCK, PLAYER2_MAX_BLOCK, { from: alice, value });
      await rps.joinGame(gameHash, MOVE.ROCK, { from: bob, value });
      await expectedException(() =>
        rps.gameResult(gameHash, MOVE.ROCK, aliceSecret, { from: alice })
      );
    });

    it('should get winner id is 1 (ROCK vs SCISSORS)', async () => {
      const value = web3Utils.toWei('0.01', 'ether');
      const gameHash = await rps.hash(alice, MOVE.ROCK, aliceSecret, {
        from: alice
      });

      await rps.startGame(gameHash, bob, PLAYER1_MAX_BLOCK, PLAYER2_MAX_BLOCK, { from: alice, value });
      await rps.joinGame(gameHash, MOVE.SCISSORS, { from: bob, value });
      const tx = await rps.gameResult(gameHash, MOVE.ROCK, aliceSecret, {
        from: alice
      });
      const log = getTxEvent1stLog(tx);

      expect(log.event).to.equal('LogGameResult');
      expect(log.args.player1).to.equal(alice);
      expect(log.args.player2).to.equal(bob);
      expect(log.args.move2.toNumber()).to.equal(MOVE.SCISSORS);
      expect(log.args.winnerId.toNumber()).to.equal(1);
    });

    it('should get winner id is 2 (SCISSORS vs ROCK)', async () => {
      const value = web3Utils.toWei('0.01', 'ether');
      const gameHash = await rps.hash(alice, MOVE.SCISSORS, aliceSecret, {
        from: alice
      });

      await rps.startGame(gameHash, bob, PLAYER1_MAX_BLOCK, PLAYER2_MAX_BLOCK, { from: alice, value });
      await rps.joinGame(gameHash, MOVE.ROCK, { from: bob, value });
      const tx = await rps.gameResult(gameHash, MOVE.SCISSORS, aliceSecret, {
        from: alice
      });
      const log = getTxEvent1stLog(tx);

      expect(log.event).to.equal('LogGameResult');
      expect(log.args.player1).to.equal(alice);
      expect(log.args.player2).to.equal(bob);
      expect(log.args.move2.toNumber()).to.equal(MOVE.ROCK);
      expect(log.args.winnerId.toNumber()).to.equal(2);
    });

    it('should end in a tie', async () => {
      const value = web3Utils.toWei('0.01', 'ether');
      const gameHash = await rps.hash(alice, MOVE.ROCK, aliceSecret, {
        from: alice
      });

      await rps.startGame(gameHash, bob, PLAYER1_MAX_BLOCK, PLAYER2_MAX_BLOCK, { from: alice, value });
      await rps.joinGame(gameHash, MOVE.ROCK, { from: bob, value });
      const tx = await rps.gameResult(gameHash, MOVE.ROCK, aliceSecret, {
        from: alice
      });
      const log = getTxEvent1stLog(tx);

      expect(log.event).to.equal('LogGameResult');
      expect(log.args.player1).to.equal(alice);
      expect(log.args.player2).to.equal(bob);
      expect(log.args.move2.toNumber()).to.equal(MOVE.ROCK);
      expect(log.args.winnerId.toNumber()).to.equal(0);
    });

    it('should get winner id is 1 (PAPER vs ROCK)', async () => {
      const value = web3Utils.toWei('0.01', 'ether');
      const gameHash = await rps.hash(alice, MOVE.PAPER, aliceSecret, {
        from: alice
      });

      await rps.startGame(gameHash, bob, PLAYER1_MAX_BLOCK, PLAYER2_MAX_BLOCK, { from: alice, value });
      await rps.joinGame(gameHash, MOVE.ROCK, { from: bob, value });
      const tx = await rps.gameResult(gameHash, MOVE.PAPER, aliceSecret, {
        from: alice
      });
      const log = getTxEvent1stLog(tx);

      expect(log.event).to.equal('LogGameResult');
      expect(log.args.player1).to.equal(alice);
      expect(log.args.player2).to.equal(bob);
      expect(log.args.move2.toNumber()).to.equal(MOVE.ROCK);
      expect(log.args.winnerId.toNumber()).to.equal(1);
    });
  });

  describe('withdraw function', () => {
    it('should fail if alice balances is zero', async () => {
      const value = web3Utils.toWei('0.01', 'ether');
      const gameHash = await rps.hash(alice, MOVE.SCISSORS, aliceSecret, {
        from: alice
      });

      await rps.startGame(gameHash, bob, PLAYER1_MAX_BLOCK, PLAYER2_MAX_BLOCK, { from: alice, value });
      await rps.joinGame(gameHash, MOVE.ROCK, { from: bob, value });
      await rps.gameResult(gameHash, MOVE.SCISSORS, aliceSecret, {
        from: alice
      });
      await expectedException(() => rps.withdraw({ from: alice }));
    });

    it('should withdraw 0.02 ether by alice', async () => {
      const value = web3Utils.toWei('0.01', 'ether');
      const gameHash = await rps.hash(alice, MOVE.PAPER, aliceSecret, {
        from: alice
      });

      await rps.startGame(gameHash, bob, PLAYER1_MAX_BLOCK, PLAYER2_MAX_BLOCK, { from: alice, value });
      await rps.joinGame(gameHash, MOVE.ROCK, { from: bob, value });
      const tx = await rps.gameResult(gameHash, MOVE.PAPER, aliceSecret, {
        from: alice
      });
      const log = getTxEvent1stLog(tx);

      expect(log.event).to.equal('LogGameResult');
      expect(log.args.player1).to.equal(alice);
      expect(log.args.player2).to.equal(bob);
      expect(log.args.gameHash).to.equal(gameHash);
      expect(log.args.winnerId.toNumber()).to.equal(1);

      const aliceBalance = await rps.balances(alice);
      const expectValue = web3Utils.toWei('0.02', 'ether')
      expect(aliceBalance.toString(10)).to.equal(expectValue.toString(10));

      await rps.withdraw({ from: alice });
      const afterAliceWithdraw = await rps.balances(alice);
      expect(afterAliceWithdraw.toNumber()).to.equal(0);
    });

    it('should end in a tie', async () => {
      const value = web3Utils.toWei('0.01', 'ether');
      const gameHash = await rps.hash(alice, MOVE.ROCK, aliceSecret, {
        from: alice
      });

      await rps.startGame(gameHash, bob, PLAYER1_MAX_BLOCK, PLAYER2_MAX_BLOCK, { from: alice, value });
      await rps.joinGame(gameHash, MOVE.ROCK, { from: bob, value });
      const tx = await rps.gameResult(gameHash, MOVE.ROCK, aliceSecret, {
        from: alice
      });
      const log = getTxEvent1stLog(tx);

      expect(log.event).to.equal('LogGameResult');
      expect(log.args.player1).to.equal(alice);
      expect(log.args.player2).to.equal(bob);
      expect(log.args.gameHash).to.equal(gameHash);
      expect(log.args.winnerId.toNumber()).to.equal(0);

      const aliceBalance = await rps.balances(alice);
      const bobBalance = await rps.balances(bob);

      expect(aliceBalance.toString(10)).to.equal(value.toString(10));
      expect(bobBalance.toString(10)).to.equal(value.toString(10));

      await rps.withdraw({ from: alice });
      await rps.withdraw({ from: bob });

      const aliceAfterWithdraw = await rps.balances(alice);
      const bobAfterWithdraw = await rps.balances(bob);

      expect(aliceAfterWithdraw.toNumber()).to.equal(0);
      expect(bobAfterWithdraw.toNumber()).to.equal(0);
    });
  });
});
