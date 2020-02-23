'use strict'

const firebase = require('firebase')
const log = require('./logging')
const enqueueJob = require('./job-queue')
const {addShutdownTask, shutdown} = require('./shutdown')

module.exports = listen

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

        enqueueJob({
          documentRef: commandSnapshot.ref,
          command: commandSnapshot.data(),
        })
      },
      error => {
        log.error('Firebase listen error, shutting down.', error)
        shutdown()
      }
    )

  addShutdownTask(unsubscribe)
}
