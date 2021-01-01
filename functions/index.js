// [START import]
// The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
const functions = require("firebase-functions");
// The Firebase Admin SDK to access Cloud Firestore.
const admin = require("firebase-admin");
const { debug, info, error } = require("firebase-functions/lib/logger");

const { customAlphabet } = require("nanoid");
const nanoid = customAlphabet("123456789ABCDEFGHIJKLMNPQRSTUVWXYZ", 8);

const { dateToTimestamp } = require("./lib/utils");
admin.initializeApp();

const defaultPicture = "https://www.gravatar.com/avatar?d=robohash&s=200";
const defaultName = "Test User";
// Take the text parameter passed to this HTTP endpoint and insert it into
// Cloud Firestore under the path /messages/:documentId/original
exports.seed = functions.https.onCall(async (data, context) => {
  for (let index = 1; index < data.words.length; index++) {
    admin
      .firestore()
      .collection("words")
      .doc(index.toString())
      .set({ number: index, word: data.words[index] });
  }

  // await Promise.all(tasks);
  return {
    seeded: true,
  };
});

// Take the text parameter passed to this HTTP endpoint and insert it into
// Cloud Firestore under the path /messages/:documentId/original
exports.createGame = functions.https.onCall(async (data, context) => {
  // Checking that the user is authenticated.
  if (!context.auth) {
    // Throwing an HttpsError so that the client gets the error details.
    throw new functions.https.HttpsError(
      "failed-precondition",
      "The function must be called while authenticated."
    );
  }

  const userId = context.auth.uid;
  const displayName = data.displayName || defaultName;
  const avatar = data.photoURL || defaultPicture;
  const newJibeDocument = nanoid();

  // Date to Timestamp
  const startTime = dateToTimestamp(new Date());

  // Get a new write batch
  const batch = admin.firestore().batch();

  // Get ref to new jibe game
  const jibeRef = admin.firestore().collection("jibe").doc(newJibeDocument);

  const wordRef = admin.firestore().collection("words");
  const words = (await wordRef.get()).docs.length;
  var jibewords = [];
  while (jibewords.length < 51) {
    var r = Math.floor(Math.random() * words) + 1;
    if (jibewords.indexOf(r) === -1) jibewords.push(r);
  }

  const map = {};
  for (let index = 1; index < jibewords.length; index++) {
    const value = jibewords[index];

    map[index] = value;
  }

  batch.set(jibeRef, {
    started: startTime,
    createdBy: userId,
    status: "Created",
    words: map,
    currentRound: 0,
  });

  // Add requester as first player
  const playersRef = admin
    .firestore()
    .collection("jibe")
    .doc(newJibeDocument)
    .collection("players")
    .doc(userId);

  batch.set(playersRef, {
    displayName: displayName,
    avatar: avatar,
    playerNumber: 1,
    userId: userId,
    score: 0,
  });

  try {
    // Commit the batch
    await batch.commit();
    //   // Send back a message that we've successfully written the message
    return {
      gameId: newJibeDocument,
    };
  } catch (e) {
    error(e);
    throw new functions.https.HttpsError(
      "internal",
      "Error occurred while creating new game"
    );
  }
});

// Take the text parameter passed to this HTTP endpoint and insert it into
// Cloud Firestore under the path /messages/:documentId/original
exports.joinGame = functions.https.onCall(async (data, context) => {
  // Checking that the user is authenticated.
  if (!context.auth) {
    // Throwing an HttpsError so that the client gets the error details.
    throw new functions.https.HttpsError(
      "failed-precondition",
      "The function must be called while authenticated."
    );
  }

  // Add requester as additional player
  const gameId = data.gameId.toUpperCase();
  const userId = context.auth.uid;
  const displayName = context.auth.token.name || defaultName;
  const avatar = context.auth.token.picture || defaultPicture;

  info(
    `user with id ${userId} and displayName ${displayName} is joining game ${gameId}`
  );

  // Get ref to new jibe game
  const gameRef = await admin.firestore().collection("jibe").doc(gameId);
  const game = await gameRef.get();

  if (game.exists) {
    if (game.data()["status"] === "Created") {
      const playersRef = await gameRef.collection("players");

      const currentPlayer = await playersRef.doc(userId).get();
      if (!currentPlayer.exists) {
        try {
          const players = await playersRef.get();
          const currentCount = players.docs.length;
          admin
            .firestore()
            .collection("jibe")
            .doc(gameId)
            .collection("players")
            .doc(userId)
            .set({
              displayName: displayName,
              avatar: avatar,
              playerNumber: currentCount + 1,
              userId: userId,
              score: 0,
            });
          return {
            newPlayerId: userId,
            gameId: gameId,
          };
        } catch (e) {
          error(e);
          throw new functions.https.HttpsError(
            "internal",
            "An unknown error occurred joining game"
          );
        }
      } else {
        info(
          `user with id ${userId} and displayName ${displayName} is already a member of ${gameId}`
        );
        return {
          newPlayerId: userId,
          gameId: gameId,
        };
      }
    } else {
      info(`Game id ${gameId} has a status of ${game.data()["status"]}`);
      switch (game.data()["status"]) {
        case "Started":
          throw new functions.https.HttpsError(
            "invalid-argument",
            "Can't join because it has been started!"
          );
        case "Finished":
          throw new functions.https.HttpsError(
            "invalid-argument",
            "Can't join because game is over!"
          );
        default:
          throw new functions.https.HttpsError(
            "invalid-argument",
            `Game id ${gameId} is ${game.data()["status"]}`
          );
      }
    }
  } else {
    throw new functions.https.HttpsError(
      "not-found",
      `Game ${gameId} does not exist!`
    );
  }
});

exports.startGame = functions.https.onCall(async (data, context) => {
  // Checking that the user is authenticated.
  if (!context.auth) {
    // Throwing an HttpsError so that the client gets the error details.
    throw new functions.https.HttpsError(
      "failed-precondition",
      "The function must be called while authenticated."
    );
  }
  // Add requester as additional player
  const gameId = data.gameId.toUpperCase();
  const userId = context.auth.uid;
  const displayName = context.auth.token.name || defaultName;

  info(
    `user with id ${userId} and displayName ${displayName} has started game ${gameId}`
  );

  // Get ref to new jibe game
  const gameRef = await admin.firestore().collection("jibe").doc(gameId);
  const game = await gameRef.get();

  if (game.exists) {
    if (game.data()["status"] === "Created") {
      // Get a new write batch
      const batch = admin.firestore().batch();

      batch.set(
        gameRef,
        {
          status: "Started",
          currentRound: 1,
        },
        { merge: true }
      );

      try {
        const word = game.data()["words"][1];
        const wordRef = await admin
          .firestore()
          .collection("words")
          .doc(word.toString())
          .get();

        const roundsRef = admin
          .firestore()
          .collection("jibe")
          .doc(gameId)
          .collection("rounds")
          .doc("1");

        batch.set(
          roundsRef,
          {
            number: 1,
            word: wordRef.data()["word"],
            turns: [],
            status: "Started",
          },
          { merge: true }
        );

        // Commit the batch
        await batch.commit();

        // Send back a message that we've successfully started the game
        return {
          gameId: gameId,
          status: "Started",
        };
      } catch (e) {
        error(e);
        throw new functions.https.HttpsError(
          "internal",
          "An unknown error occurred joining game"
        );
      }
    } else {
      info(`Game id ${gameId} has a status of ${game.data()["status"]}`);
      switch (game.data()["status"]) {
        case "Started":
          throw new functions.https.HttpsError(
            "invalid-argument",
            "Can't join because it has been started!"
          );
        case "Finished":
          throw new functions.https.HttpsError(
            "invalid-argument",
            "Can't join because game is over!"
          );
        default:
          throw new functions.https.HttpsError(
            "invalid-argument",
            `Game id ${gameId} is ${game.data()["status"]}`
          );
      }
    }
  } else {
    throw new functions.https.HttpsError(
      "not-found",
      `Game ${gameId} does not exist!`
    );
  }
});

exports.takeTurn = functions.https.onCall(async (data, context) => {
  // Checking that the user is authenticated.
  if (!context.auth) {
    // Throwing an HttpsError so that the client gets the error details.
    throw new functions.https.HttpsError(
      "failed-precondition",
      "The function must be called while authenticated."
    );
  }

  const gameId = data.gameId.toUpperCase();
  const round = data.round;
  const answer = data.answer;

  const userId = context.auth.uid;
  const displayName = context.auth.token.name || defaultName;

  info(
    `user with id ${userId} and displayName ${displayName} has taken a turn with the word ${answer}`
  );

  // Get ref to new jibe game
  const gameRef = await admin.firestore().collection("jibe").doc(gameId);
  const game = await gameRef.get();

  if (game.exists) {
    if (game.data()["status"] === "Started") {
      const roundRef = gameRef.collection("rounds").doc(round.toString());
      const roundDoc = await roundRef.get();

      if (roundDoc.exists) {
        try {
          await roundRef.collection("turns").doc(userId).set(
            {
              playerId: userId,
              answer: answer,
            },
            { merge: true }
          );

          // Send back a message that we've successfully taken a turn
          return {
            gameId: gameId,
            playerId: userId,
            answer: answer,
          };
        } catch (e) {
          error(e);
          throw new functions.https.HttpsError(
            "internal",
            "An unknown error occurred joining game"
          );
        }
      } else {
        throw new functions.https.HttpsError(
          "not-found",
          `The round specified (${round}) does not exist.`
        );
      }
    } else {
      info(`Game id ${gameId} has a status of ${game.data()["status"]}`);
      switch (game.data()["status"]) {
        case "Finished":
          throw new functions.https.HttpsError(
            "invalid-argument",
            "Can't join because game is over!"
          );
        default:
          throw new functions.https.HttpsError(
            "invalid-argument",
            `Game id ${gameId} is ${game.data()["status"]}`
          );
      }
    }
  } else {
    throw new functions.https.HttpsError(
      "not-found",
      `Game ${gameId} does not exist!`
    );
  }
});

exports.scoreRound = functions.https.onCall(async (data, context) => {
  // Checking that the user is authenticated.
  if (!context.auth) {
    // Throwing an HttpsError so that the client gets the error details.
    throw new functions.https.HttpsError(
      "failed-precondition",
      "The function must be called while authenticated."
    );
  }

  const gameId = data.gameId.toUpperCase();
  const round = data.round;
  const answers = data.answers;

  const userId = context.auth.uid;
  const displayName = context.auth.token.name || defaultName;

  info(
    `user with id ${userId} and displayName ${displayName} has scored round ${round} in game ${gameId}`
  );

  // Get ref to new jibe game
  const gameRef = admin.firestore().collection("jibe").doc(gameId);
  const game = await gameRef.get();

  if (game.exists) {
    if (game.data()["status"] === "Started") {
      const roundRef = gameRef.collection("rounds").doc(round.toString());
      const roundDoc = await roundRef.get();

      if (roundDoc.exists) {
        try {
          const turnRef = roundRef.collection("turns");
          const turns = await turnRef.get();

          turns.docs.forEach(async (turn) => {
            const playerId = turn.data()["playerId"];

            const roundScore = answers[playerId];
            if (roundScore) {
              // update round score for player
              await roundRef
                .collection("turns")
                .doc(turn.id)
                .set({ score: roundScore }, { merge: true });

              await gameRef
                .collection("players")
                .doc(playerId)
                .set(
                  { score: admin.firestore.FieldValue.increment(roundScore) },
                  { merge: true }
                );
            }
          });

          //update current round to completed
          await admin
            .firestore()
            .collection("jibe")
            .doc(gameId)
            .collection("rounds")
            .doc(round.toString())
            .set({ status: "Completed" }, { merge: true });

          const playersRef = await gameRef
            .collection("players")
            .where("score", ">=", 50)
            .orderBy("score", "desc");

          const players = await playersRef.get();

          let winner = false;

          if (players.docs.length > 0) {
            // check for tie
            const scores = players.docs.map((p) => p.data()["score"]);

            const data = scores.reduce(
              (prev, curr) => ((prev[curr] = ++prev[curr] || 1), prev),
              {}
            );

            console.log(data);

            if (data[Object.keys(data)[0]] === 1) {
              winner = true;
            }
          }

          if (winner) {
            const winningPlayer = players.docs[0];
            gameRef.set(
              {
                status: "Completed",
                winnerDisplayName: winningPlayer.data()["displayName"],
                winnerAvatar: winningPlayer.data()["avatar"],
              },
              { merge: true }
            );
          } else {
            const newRoundNumber = parseInt(round) + 1;

            const word = game.data()["words"][newRoundNumber];
            const wordRef = await admin
              .firestore()
              .collection("words")
              .doc(word.toString())
              .get();

            //create new round
            await admin
              .firestore()
              .collection("jibe")
              .doc(gameId)
              .collection("rounds")
              .doc(newRoundNumber.toString())
              .set({
                number: newRoundNumber,
                word: wordRef.data()["word"],
                turns: [],
                status: "Started",
              });

            gameRef.set({ currentRound: newRoundNumber }, { merge: true });
          }

          // Send back a message that we've successfully taken a turn
          return {
            gameId: gameId,
          };
        } catch (e) {
          error(e);
          throw new functions.https.HttpsError(
            "internal",
            "An unknown error occurred joining game"
          );
        }
      } else {
        throw new functions.https.HttpsError(
          "not-found",
          `The round specified (${round}) does not exist.`
        );
      }
    } else {
      info(`Game id ${gameId} has a status of ${game.data()["status"]}`);
      switch (game.data()["status"]) {
        case "Finished":
          throw new functions.https.HttpsError(
            "invalid-argument",
            "Can't join because game is over!"
          );
        default:
          throw new functions.https.HttpsError(
            "invalid-argument",
            `Game id ${gameId} is ${game.data()["status"]}`
          );
      }
    }
  } else {
    throw new functions.https.HttpsError(
      "not-found",
      `Game ${gameId} does not exist!`
    );
  }
});

exports.roundStatus = functions.firestore
  .document("jibe/{docId}/rounds/{roundNumber}/turns/{turnNumber}")
  .onWrite(async (change, context) => {
    // Get ref to new jibe game
    const gameRef = await admin
      .firestore()
      .collection("jibe")
      .doc(context.params.docId);
    const playersRef = await gameRef.collection("players");
    const roundRef = await gameRef
      .collection("rounds")
      .doc(context.params.roundNumber);
    const turnsRef = await gameRef
      .collection("rounds")
      .doc(context.params.roundNumber)
      .collection("turns");
    const players = await playersRef.get();
    const currentCount = players.docs.length;
    const turns = await turnsRef.get();
    const turnCount = turns.docs.length;

    const gameRound = await gameRef.get();
    console.log(gameRound.data()["currentRound"]);
    console.log(context.params.roundNumber);

    console.log(currentCount);
    console.log(turnCount);
    if (
      currentCount === turnCount &&
      gameRound.data()["currentRound"].toString() ===
        context.params.roundNumber.toString()
    ) {
      console.log("updating status");
      await roundRef.set(
        {
          status: "Scoring",
        },
        { merge: true }
      );
    }
  });
