'use strict'

const firebase = require('firebase')
const commands = require('./commands')
const firebaseConfig = require('./firebase-config')

// Initialize Firebase
firebase.initializeApp(firebaseConfig)

go()

async function runCommand(commandSnapshot) {
  try {
    const commandDocument = commandSnapshot.data()
    const updates = await doCommandWork(commandDocument)

    const documentUpdates = {
      ...updates,
      isPending: false,
      doneAt: new Date(),
    }
    console.log('COMMAND DONE:', documentUpdates)
    await commandSnapshot.ref.update(documentUpdates)
  } catch (error) {
    firebase.app().delete()
    throw error
  }
}

async function doCommandWork(commandDocument) {
  if (
    commandDocument.expiresAt !== undefined &&
    commandDocument.expiresAt.toDate() < new Date()
  ) {
    console.log('COMMAND EXPIRED:', commandDocument)
    return {
      isExpired: true,
    }
  }

  if (commands[commandDocument.command] === undefined) {
    return {
      isSuccess: false,
      error: new Error('Command not found').stack,
    }
  }

  try {
    const result = await commands[commandDocument.command](
      commandDocument.options
    )
    if (result !== undefined) {
      return {
        ...result,
        isSuccess: true,
      }
    }

    return {
      isSuccess: true,
    }
  } catch (error) {
    return {
      isSuccess: false,
      error: error.stack,
    }
  }
}

let commandPromise = Promise.resolve()

async function go() {
  try {
    await firebase
      .auth()
      .signInWithEmailAndPassword(
        process.env.FEEDER_USERNAME,
        process.env.FEEDER_PASSWORD
      )

    // Process 1 command at a time
    firebase
      .firestore()
      .collection('commands')
      .where('isPending', '==', true)
      .orderBy('createdAt')
      .limit(1)
      .onSnapshot(
        commandsSnapshot => {
          if (commandsSnapshot.size === 0) {
            console.log('NO COMMANDS')
            return
          }

          const commandSnapshot = commandsSnapshot.docs[0]

          console.log('INCOMING COMMAND:', commandSnapshot.data())

          commandPromise = (async () => {
            await commandPromise
            runCommand(commandSnapshot)
          })()
        },
        error => {
          firebase.app().delete()
          throw error
        }
      )
  } catch (error) {
    firebase.app().delete()
    throw error
  }
}
