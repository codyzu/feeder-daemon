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
    .collection('jobs')
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

        const job = {...commandSnapshot.data()}
        if (job.createdAt !== undefined) {
          job.createdAt = job.createdAt.toDate()
        }

        if (job.expiresAt !== undefined) {
          job.expiresAt = job.expiresAt.toDate()
        }

        enqueueJob({
          documentRef: commandSnapshot.ref,
          command: job,
        })
      },
      error => {
        log.error('Firebase listen error, shutting down.', error)
        shutdown()
      }
    )

  addShutdownTask(unsubscribe)
}
