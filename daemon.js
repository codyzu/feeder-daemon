'use strict'

const firebase = require('firebase')
const firebaseConfig = require('./firebase-config')
const {addShutdownTask} = require('./shutdown')
const startAsyncJobs = require('./jobs-async')
const {
  listen: startScheduleListener,
  loadLocalJobs,
} = require('./jobs-schedule')
const log = require('./logging')

module.exports = go

// Initialize Firebase
firebase.initializeApp(firebaseConfig)
addShutdownTask(() => firebase.app().delete())

async function go() {
  // Set firestore to offline mode
  // Any executed commands before authentication will attempt to write to firestore and get cached
  await firebase.firestore().disableNetwork()
  await loadLocalJobs()

  // Attempt to authenticate and go online
  await attemptGoOnline()
}

async function attemptGoOnline() {
  try {
    await authenticate()
  } catch (error) {
    log.error('Unable to connect to firebase.', error)
    log.warn('Retrying in 30 seconds')
    setTimeout(attemptGoOnline, 30 * 1000)
    return
  }

  // If auth was successful, enable firestore and start listening for jobs
  await firebase.firestore().enableNetwork()
  startScheduleListener()
  startAsyncJobs()
}

async function authenticate() {
  try {
    // Try to authenticate
    await firebase
      .auth()
      .signInWithEmailAndPassword(
        process.env.FEEDER_USERNAME,
        process.env.FEEDER_PASSWORD
      )
  } catch (error) {
    // Wrap the firebase auth error object into a real Error
    // See https://firebase.google.com/docs/reference/node/firebase.auth.Error
    throw new Error(`Firebase Auth ${error.code} ${error.message}`)
  }
}
