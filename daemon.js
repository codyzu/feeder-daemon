'use strict'

const firebase = require('firebase')
const commands = require('./commands')
const firebaseConfig = require('./firebase-config')
const log = require('./logging')

module.exports = go

// Initialize Firebase
firebase.initializeApp(firebaseConfig)

async function runCommand(commandSnapshot) {
  try {
    const commandDocument = commandSnapshot.data()
    log.info('Runing command', {commandDocument})
    const updates = await doCommandWork(commandDocument)

    const documentUpdates = {
      ...updates,
      isPending: false,
      doneAt: new Date(),
    }
    log.info('Command done', {documentUpdates})
    await commandSnapshot.ref.update(documentUpdates)
  } catch (error) {
    log.error(error)
    firebase.app().delete()
    throw error
  }
}

async function doCommandWork(commandDocument) {
  if (
    commandDocument.expiresAt !== undefined &&
    commandDocument.expiresAt.toDate() < new Date()
  ) {
    log.warn('Command expired', {commandDocument})
    return {
      isExpired: true,
    }
  }

  try {
    if (commands[commandDocument.command] === undefined) {
      throw new Error(`Command ${commandDocument.command} not found`)
    }

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
    log.error(error)
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
            log.info('No commands')
            return
          }

          const commandSnapshot = commandsSnapshot.docs[0]

          log.info(`Incomming command ${commandSnapshot.data().command}`)

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
    log.error(error)
    throw error
  }
}
