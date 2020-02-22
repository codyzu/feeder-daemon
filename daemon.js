'use strict'

const firebase = require('firebase')
const firebaseConfig = require('./firebase-config')
const runEngine = require('./engine')
const log = require('./logging')

module.exports = go

// Initialize Firebase
firebase.initializeApp(firebaseConfig)

async function runCommand(commandSnapshot) {
  try {
    const commandDocument = commandSnapshot.data()
    const updates = await runEngine(commandDocument)

    const documentUpdates = {
      ...updates,
      isPending: false,
      doneAt: new Date(),
    }
    log.info('Writing command results', {documentUpdates})
    await commandSnapshot.ref.update(documentUpdates)
  } catch (error) {
    log.error(error)
    firebase.app().delete()
    throw error
  }
}

let commandPromise = Promise.resolve()

async function go() {
  try {
    await authenticate()
    listen()
  } catch (error) {
    log.error('Unable to connect to firebase.', error)
    log.warn('Retrying in 30 seconds')
    setTimeout(go, 30 * 1000)
  }
}

async function authenticate() {
  try {
    await firebase
      .auth()
      .signInWithEmailAndPassword(
        process.env.FEEDER_USERNAME,
        process.env.FEEDER_PASSWORD
      )
  } catch (error) {
    throw new Error(`Firebase Auth ${error.code} ${error.message}`)
  }
}

function listen() {
  // Process 1 command at a time
  const unsubscribe = firebase
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

        log.info(`Incoming command ${commandSnapshot.data().command}`)

        commandPromise = (async () => {
          await commandPromise
          runCommand(commandSnapshot)
        })()
      },
      error => {
        log.error('Firebase listen error, shutting down.', error)
        unsubscribe()
        firebase.app().delete()
        throw error
      }
    )
}
