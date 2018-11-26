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
    }

    mapping(address => uint256) public balances;
    mapping(bytes32 => Game) public games;

    event LogGameCreated(
        bytes32 indexed gameHash,
        address indexed player1,
        address indexed player2,
        uint256 price
    );
    event LogGameJoined(
        address indexed player1,
        address indexed player2,
        bytes32 indexed gameHash,
        uint move2
    );

    function hash(
        address sender,
        uint move,
        bytes32 secret
    ) public view returns(bytes32) {
        return keccak256(abi.encodePacked(this, sender, move, secret));
    }

    function gameHash(address palyer2) public view returns(bytes32) {
        return keccak256(abi.encodePacked(msg.sender, palyer2));
    }

    function startGame(
        bytes32 _gameHash,
        bytes32 move1Hash,
        address player2
    ) public payable returns (bool) {
        require(_gameHash != 0, "Game hash equals 0");
        require(move1Hash != 0, "Move 1 hash equals 0");
        require(player2 != address(0), "Player2 address equals 0");
        require(msg.value != 0, "msg.value equals 0");

        Game storage newGame = games[_gameHash];
        require(
            newGame.player1 == 0 && newGame.player2 == 0,
            "The game already started"
        );

        newGame.price = msg.value;
        newGame.move1Hash = move1Hash;
        newGame.player1 = msg.sender;
        newGame.player2 = player2;
        newGame.move1 = Move.NONE;
        newGame.move2 = Move.NONE;

        emit LogGameCreated(_gameHash, msg.sender, player2, msg.value);

        return true;
    }

    function getGame(bytes32 _gameHash) public view returns (
        uint256 price,
        address player1,
        address player2,
        bytes32 move1Hash,
        Move move1,
        Move move2
    ) {
        Game memory game = games[_gameHash];

        return (
            game.price,
            game.player1,
            game.player2,
            game.move1Hash,
            game.move1,
            game.move2
        );
    }

    function joinGame(
        bytes32 _gameHash,
        uint move2
    ) public payable returns (bool) {
        require(_gameHash != 0, "Game hash equals 0");
        require(Move(move2) != Move.NONE, "move2 equals NONE");

        Game storage joinedGame = games[_gameHash];
        address player1 = joinedGame.player1;
        address player2 = joinedGame.player2;

        require(msg.value == joinedGame.price, "msg.value not to equals game price");
        require(player1 != address(0) && player2 == msg.sender, "player address is invalid");
        require(joinedGame.move2 == Move.NONE, "The game already started");

        joinedGame.move2 = Move(move2);

        emit LogGameJoined(player1, msg.sender, _gameHash, move2);

        return true;
    }
}
