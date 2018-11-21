import { expect } from 'chai';
import { BigNumber } from 'bignumber.js';
import web3Utils from 'web3-utils';
import { default as Promise } from 'bluebird';
import expectedException from '../utils/expectedException';

const RockPaperScissors = artifacts.require('RockPaperScissors');

const getTxEvent1stLog = ({ logs: [log] }) => log;

if (typeof web3.eth.getBlockPromise !== 'function') {
  Promise.promisifyAll(web3.eth, { suffix: 'Promise' });
}

contract('RockPaperScissors', accounts => {
  // TODO:
});
