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
    it('should fail if the game hash equals 0', async () => {
      const value = web3Utils.toWei('0.01', 'ether');
      const move1Hash = await rps.hash(alice, MOVE.ROCK, aliceSecret, {
        from: alice
      });

      await expectedException(() =>
        rps.startGame('0x0', move1Hash, bob, { from: alice, value })
      );
    });

    it('should fail if the move1 hash equals 0', async () => {
      const value = web3Utils.toWei('0.01', 'ether');
      const gameHash = await rps.gameHash(bob, { from: alice });

      await expectedException(() =>
        rps.startGame(gameHash, '0x0', bob, { from: alice, value })
      );
    });

    it('should fail if the player2 address equals 0', async () => {
      const value = web3Utils.toWei('0.01', 'ether');
      const move1Hash = await rps.hash(alice, MOVE.ROCK, aliceSecret, {
        from: alice
      });
      const gameHash = await rps.gameHash(bob, { from: alice });

      await expectedException(() =>
        rps.startGame(gameHash, move1Hash, '0x0', { from: alice, value })
      );
    });

    it('should fail if the msg.value equals 0', async () => {
      const value = web3Utils.toWei('0', 'ether');
      const move1Hash = await rps.hash(alice, MOVE.ROCK, aliceSecret, {
        from: alice
      });
      const gameHash = await rps.gameHash(bob, { from: alice });

      await expectedException(() =>
        rps.startGame(gameHash, move1Hash, '0x0', { from: alice, value })
      );
    });

    it('should start the game', async () => {
      const value = web3Utils.toWei('0.01', 'ether');
      const move1Hash = await rps.hash(alice, MOVE.ROCK, aliceSecret, {
        from: alice
      });
      const gameHash = await rps.gameHash(bob, { from: alice });
      const tx = await rps.startGame(gameHash, move1Hash, bob, { from: alice, value });

      const log = getTxEvent1stLog(tx);
      expect(log.event).to.equal('LogGameCreated');
      expect(log.args.player1).to.equal(alice);
      expect(log.args.player2).to.equal(bob);
      expect(log.args.price.toString(10)).to.equal(value.toString(10));

      const game = await rps.getGame(gameHash);
      expect(game[0].toString(10)).to.equal(value.toString(10));
      expect(game[1]).to.equal(alice);
      expect(game[2]).to.equal(bob);
      expect(game[3]).to.equal(move1Hash);
      expect(game[4].toNumber()).to.equal(MOVE.NONE);
      expect(game[5].toNumber()).to.equal(MOVE.NONE);
    });

    it('should fail if the game already started', async () => {
      const value = web3Utils.toWei('0.01', 'ether');
      const move1Hash = await rps.hash(alice, MOVE.ROCK, aliceSecret, {
        from: alice
      });
      const gameHash = await rps.gameHash(bob, { from: alice });

      await rps.startGame(gameHash, move1Hash, bob, { from: alice, value })
      await expectedException(() =>
        rps.startGame(gameHash, move1Hash, bob, { from: alice, value })
      );
    });
  });

  describe('joinGame function', () => {
    it('should fail if game hash equals 0', async () => {
      const value = web3Utils.toWei('0.01', 'ether');
      const move1Hash = await rps.hash(alice, MOVE.ROCK, aliceSecret, {
        from: alice
      });
      const gameHash = await rps.gameHash(bob, { from: alice });

      await rps.startGame(gameHash, move1Hash, bob, { from: alice, value });
      await expectedException(() =>
        rps.joinGame('0x0', MOVE.ROCK, { from: bob, value })
      );
    });

    it('should fail if move2 equals NONE', async () => {
      const value = web3Utils.toWei('0.01', 'ether');
      const move1Hash = await rps.hash(alice, MOVE.ROCK, aliceSecret, {
        from: alice
      });
      const gameHash = await rps.gameHash(bob, { from: alice });

      await rps.startGame(gameHash, move1Hash, bob, { from: alice, value });
      await expectedException(() =>
        rps.joinGame(gameHash, MOVE.NONE, { from: bob, value })
      );
    });

    it('should fail if msg.value not equals join game price', async () => {
      const value = web3Utils.toWei('0.01', 'ether');
      const otherValue = web3Utils.toWei('0.001', 'ether');
      const move1Hash = await rps.hash(alice, MOVE.ROCK, aliceSecret, {
        from: alice
      });
      const gameHash = await rps.gameHash(bob, { from: alice });

      await rps.startGame(gameHash, move1Hash, bob, { from: alice, value });
      await expectedException(() =>
        rps.joinGame(gameHash, MOVE.ROCK, { from: bob, value: otherValue })
      );
    });

    it('should fail if player address is invalid', async () => {
      const value = web3Utils.toWei('0.01', 'ether');
      const move1Hash = await rps.hash(alice, MOVE.ROCK, aliceSecret, {
        from: alice
      });
      const gameHash = await rps.gameHash(bob, { from: alice });

      await rps.startGame(gameHash, move1Hash, bob, { from: alice, value });
      await expectedException(() =>
        rps.joinGame(gameHash, MOVE.ROCK, { from: carol, value })
      );
    });

    it('should fail if move2 not to equals NONE', async () => {
      const value = web3Utils.toWei('0.01', 'ether');
      const move1Hash = await rps.hash(alice, MOVE.ROCK, aliceSecret, {
        from: alice
      });
      const gameHash = await rps.gameHash(bob, { from: alice });

      await rps.startGame(gameHash, move1Hash, bob, { from: alice, value });
      await rps.joinGame(gameHash, MOVE.ROCK, { from: bob, value });
      await expectedException(() =>
        rps.joinGame(gameHash, MOVE.ROCK, { from: bob, value })
      );
    });

    it('should join the game', async () => {
      const value = web3Utils.toWei('0.01', 'ether');
      const move1Hash = await rps.hash(alice, MOVE.ROCK, aliceSecret, {
        from: alice
      });
      const gameHash = await rps.gameHash(bob, { from: alice });

      await rps.startGame(gameHash, move1Hash, bob, { from: alice, value });
      const tx = await rps.joinGame(gameHash, MOVE.PAPER, { from: bob, value });
      const log = getTxEvent1stLog(tx);

      expect(log.event).to.equal('LogGameJoined');
      expect(log.args.player1).to.equal(alice);
      expect(log.args.player2).to.equal(bob);
      expect(log.args.gameHash).to.equal(gameHash);
      expect(log.args.move2.toNumber()).to.equal(MOVE.PAPER);
    });
  });
});
