pragma solidity ^0.4.24;

contract RockPaperScissors {
    enum Move { NONE, ROCK, PAPER, SCISSORS }

    struct Game {
        uint256 price;
        address player1;
        address player2;
        bytes32 move1Hash;
        Move move1;
        Move move2;
        uint timeoutBlock;
    }

    mapping(address => uint256) public balances;
    mapping(bytes32 => Game) public games;

    event LogGameCreated(
        bytes32 indexed gameHash,
        address indexed player1,
        address indexed player2,
        uint256 price,
        uint timeoutBlock
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
        Move move1,
        Move move2,
        uint winnerId
    );
    event LogWithdraw(address indexed player, uint256 amount);

    function hash(
        address sender,
        uint move,
        bytes32 secret
    ) public view returns(bytes32) {
        return keccak256(abi.encodePacked(this, sender, move, secret));
    }

    function startGame(
        bytes32 _gameHash,
        bytes32 move1Hash,
        address player2,
        uint gameTimeout
    ) public payable returns (bool) {
        require(_gameHash != 0, "Game hash is required");
        require(move1Hash != 0, "Move 1 hash is required");
        require(player2 != address(0), "Player2 address is required");
        require(gameTimeout != 0, "Game timeout is required");
        require(msg.value != 0, "msg.value is required");

        Game storage newGame = games[_gameHash];
        require(newGame.player1 == address(0), "The player1 address required as 0");
        require(newGame.player2 == address(0), "The player2 address required as 0");

        uint timeoutBlock = block.number + gameTimeout;

        newGame.price = msg.value;
        newGame.move1Hash = move1Hash;
        newGame.player1 = msg.sender;
        newGame.player2 = player2;
        newGame.timeoutBlock = timeoutBlock;

        emit LogGameCreated(
            _gameHash,
            msg.sender,
            player2,
            msg.value,
            timeoutBlock
        );

        return true;
    }

    function joinGame(
        bytes32 _gameHash,
        uint move2
    ) public payable returns (bool) {
        require(Move(move2) != Move.NONE, "move2 is required");
        require(!timeoutExpired(_gameHash), "The game is required not expired");

        Game storage joinedGame = games[_gameHash];
        address player1 = joinedGame.player1;
        address player2 = joinedGame.player2;

        require(msg.value == joinedGame.price, "msg.value is required equal to game price");
        require(player1 != address(0), "player1 address is required");
        require(player2 == msg.sender, "player2 should equal to sender");
        require(joinedGame.move2 == Move.NONE, "The player2 move should equal to NONE");

        joinedGame.move2 = Move(move2);

        emit LogGameJoined(player1, msg.sender, _gameHash, move2);

        return true;
    }

    function gameResult(
        bytes32 _gameHash,
        uint move1,
        bytes32 secret1
    ) public returns (uint winnerId) {
        require(_gameHash != 0, "The game hash is required");
        require(Move(move1) != Move.NONE, "The move1 is required");
        require(!timeoutExpired(_gameHash), "The game is required not expired");

        Game storage game = games[_gameHash];
        address player1 = game.player1;
        address player2 = game.player2;

        require(
            game.move1 == Move.NONE && game.move2 != Move.NONE,
            "The move is invalid"
        );
        require(
            game.move1Hash == hash(msg.sender, move1, secret1),
            "The move1Hash requied equal to hash result"
        );

        game.move1 = Move(move1);
        winnerId = getWinner(game);
        reward(game, winnerId);

        emit LogGameResult(
            player1,
            player2,
            _gameHash,
            game.move1,
            game.move2,
            winnerId
        );

        return winnerId;
    }

    function getWinner(Game storage game) private view returns (uint) {
        Move move1 = game.move1;
        Move move2 = game.move2;

        if (move1 == move2) {
            return 0;
        }
        if (move1 == Move.ROCK && move2 == Move.SCISSORS) {
            return 1;
        }
        if (move1 == Move.SCISSORS && move2 == Move.ROCK) {
            return 2;
        }

        return move1 > move2 ? 1 : 2;
    }

    function reward(Game storage game, uint winner) private {
        address player1 = game.player1;
        address player2 = game.player2;
        uint256 price = game.price;

        if (winner == 0) {
            balances[player1] = balances[player1] + price;
            balances[player2] = balances[player2] + price;
        } else if (winner == 1) {
            balances[player1] = balances[player1] + (price * 2);
            balances[player2] = 0;
        } else if (winner == 2) {
            balances[player2] = balances[player2] + (price * 2);
            balances[player1] = 0;
        } else {
            revert("winner id is invalid");
        }
    }

    function timeoutExpired(bytes32 _gameHash) public view returns (bool) {
        return block.number > games[_gameHash].timeoutBlock;
    }

    function claimRefund(bytes32 _gameHash) public returns (uint winnerId) {
        require(_gameHash != 0, "The game hash is required");
        require(timeoutExpired(_gameHash), "The game deadline should be expired");

        Game storage game = games[_gameHash];
        address player1 = game.player1;
        address player2 = game.player2;

        require(
            player1 != address(0) && player2 != address(0),
            "player address is required"
        );
        require(
            game.move1 != Move.NONE && game.move2 != Move.NONE,
            "The move is required"
        );

        winnerId = getWinner(game);
        reward(game, winnerId);

        return winnerId;
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
