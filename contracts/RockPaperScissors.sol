pragma solidity ^0.4.24;

import "./SafeMath.sol";

contract RockPaperScissors {
    using SafeMath for uint256;

    enum Move { NONE, ROCK, PAPER, SCISSORS }

    struct Game {
        uint256 price;
        address player1;
        address player2;
        bytes32 move1Hash;
        uint player1Deadline;
        uint player2Deadline;
        Move move2;
    }

    mapping(address => uint256) public balances;
    mapping(bytes32 => Game) public games;

    event LogGameCreated(
        bytes32 indexed gameHash,
        address indexed player1,
        address indexed player2,
        uint256 price,
        uint player1Deadline,
        uint player2Deadline
    );
    event LogGameJoined(
        address indexed player1,
        address indexed player2,
        bytes32 indexed gameHash,
        uint move2
    );
    event LogGameResult(
        address indexed player1,
        address indexed player2,
        bytes32 indexed gameHash,
        Move move2,
        uint winnerId
    );
    event LogWithdraw(address indexed player, uint256 amount);

    function hash(
        address sender,
        uint move,
        bytes32 secret
    ) public view returns(bytes32) {
        require(sender != address(0), "The sender address is required");
        require(Move(move) != Move.NONE, "The 'move' is required");
        require(Move(move) <= Move.SCISSORS, "The 'move' should be ROCK or PAPER, SCISSORS");
        require(secret != bytes32(0), "The secret is required");

        return keccak256(abi.encodePacked(this, sender, move, secret));
    }

    function startGame(
        bytes32 move1Hash,
        address player2,
        uint player1MaxBlock,
        uint player2MaxBlock
    ) public payable returns (bool) {
        require(move1Hash != 0, "Move 1 hash is required");
        require(player2 != address(0), "Player2 address is required");
        require(msg.value != 0, "Game cannot be played for free");

        Game storage newGame = games[move1Hash];
        require(newGame.player2 == address(0), "You can't overwrite a running game");
        require(player1MaxBlock > 0, "The max block should be more than 0");
        require(player2MaxBlock > 0, "The max block should be more than 0");

        uint player2Deadline = block.number + player2MaxBlock;
        uint player1Deadline = player2Deadline + player1MaxBlock;

        newGame.price = msg.value;
        newGame.move1Hash = move1Hash;
        newGame.player1 = msg.sender;
        newGame.player2 = player2;
        newGame.player1Deadline = player1Deadline;
        newGame.player2Deadline = player2Deadline;

        emit LogGameCreated(
            move1Hash,
            msg.sender,
            player2,
            msg.value,
            player1Deadline,
            player2Deadline
        );

        return true;
    }

    function joinGame(
        bytes32 move1Hash,
        uint move2
    ) public payable returns (bool) {
        require(Move(move2) != Move.NONE, "move2 is required");

        Game storage joinedGame = games[move1Hash];
        address player1 = joinedGame.player1;
        address player2 = joinedGame.player2;

        require(player1 != address(0), "player1 address is required");
        require(player2 == msg.sender, "player2 should be equal to sender");
        require(
            joinedGame.move2 == Move.NONE,
            "The player2 should not have played yet"
        );
        require(
            block.number <= joinedGame.player2Deadline,
            "The player2 should play during the deadline limit"
        );

        joinedGame.move2 = Move(move2);

        emit LogGameJoined(player1, msg.sender, move1Hash, move2);

        return true;
    }

    function gameResult(
        bytes32 move1Hash,
        uint move1,
        bytes32 secret1
    ) public returns (uint winnerId) {
        require(move1Hash != 0, "The game hash is required");
        require(Move(move1) != Move.NONE, "The move1 is required");

        Game storage game = games[move1Hash];
        address player1 = game.player1;
        address player2 = game.player2;

        require(game.move2 != Move.NONE, "The move2 is invalid");
        require(
            game.move1Hash == hash(msg.sender, move1, secret1),
            "The move1Hash requied equal to hash result"
        );
        require(
            block.number <= game.player1Deadline,
            "The player1 should reveal the game result during the deadline limit"
        );

        uint256 price = game.price;
        winnerId = getWinner(move1Hash, Move(move1));

        if (winnerId == 0) {
            balances[player1] = balances[player1].add(price);
            balances[player2] = balances[player2].add(price);
        } else if (winnerId == 1) {
            balances[player1] = balances[player1].add(price.mul(2));
        } else if (winnerId == 2) {
            balances[player2] = balances[player2].add(price.mul(2));
        } else {
            revert("winner id is invalid");
        }

        emit LogGameResult(
            player1,
            player2,
            move1Hash,
            game.move2,
            winnerId
        );

        resetGame(game);

        return winnerId;
    }

    function getWinner(bytes32 move1Hash, Move move1) public view returns (uint) {
        Game storage game = games[move1Hash];

        if (move1 == game.move2) {
            return 0;
        }
        if (move1 == Move.ROCK && game.move2 == Move.SCISSORS) {
            return 1;
        }
        if (move1 == Move.SCISSORS && game.move2 == Move.ROCK) {
            return 2;
        }

        return move1 > game.move2 ? 1 : 2;
    }

    function claimPlayer2Unplay(bytes32 move1Hash) public returns (bool) {
        require(move1Hash != 0, "The move1 hash is required");

        Game storage game = games[move1Hash];
        require(
            game.move2 == Move.NONE,
            "The player2 un play the game"
        );
        require(
            game.player2Deadline < block.number,
            "The block number should be more than player2Deadeline"
        );

        uint256 price = game.price;
        game.price = 0;
        balances[game.player1] = balances[game.player1].add(price);
        resetGame(game);

        return true;
    }

    function claimPlayer1UnReveal(bytes32 move1Hash) public returns (bool) {
        require(move1Hash != 0, "The move1 hash is required");

        Game storage game = games[move1Hash];
        require(game.move2 != Move.NONE, "The player2 move is required");
        require(
            game.player1Deadline < block.number,
            "The block number should be more than player1Deadline"
        );

        uint256 price = game.price;
        game.price = 0;
        balances[game.player2] = balances[game.player2].add(price.mul(2));
        resetGame(game);

        return true;
    }

    function resetGame(Game storage game) private {
        game.player1 = address(0);
        game.player2 = address(0);
        game.move1Hash = bytes32(0);
        game.player1Deadline = 0;
        game.player2Deadline = 0;
        game.move2 = Move.NONE;
    }

    function withdraw() public returns (bool) {
        uint256 amount = balances[msg.sender];
        require(amount > 0, "Nothing to withdraw, amount equals 0");

        balances[msg.sender] = 0;
        emit LogWithdraw(msg.sender, amount);
        msg.sender.transfer(amount);

        return true;
    }
}
