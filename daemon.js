'use strict'

const firebase = require('firebase')
const firebaseConfig = require('./firebase-config')
const {addShutdownTask} = require('./shutdown')
const startAsyncJobs = require('./jobs-async')
const startScheduledJobs = require('./jobs-schedule')
const log = require('./logging')

module.exports = go

// Initialize Firebase
firebase.initializeApp(firebaseConfig)
addShutdownTask(() => firebase.app().delete())

async function go() {
  // Set firestore to offline mode
  // Assume eventually we will authenticate and any changes will get written back to firestore
  await firebase.firestore().disableNetwork()
  await attemptGoOnline()
  startScheduledJobs()
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
    throw new Error(`Firebase Auth ${error.code} ${error.message}`)
  }
}
