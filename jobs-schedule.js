'use strict'

const fs = require('fs').promises
const schedule = require('node-schedule')
const firebase = require('firebase')
const {isEqual} = require('lodash')
const enqueueJob = require('./job-queue')
const {addShutdownTask} = require('./shutdown')
const log = require('./logging')
const {shutdown} = require('./shutdown')

module.exports = {
  loadLocalJobs,
  listen,
}

const jobFile = './jobs.json'
let cachedJobs

function startScheduledJobs() {
  log.info('Scheduling jobs')
  cachedJobs.forEach(c => {
    log.debug('Scheduling job', {command: c})
    const job = schedule.scheduleJob(c.schedule, () =>
      enqueueJob({
        documentRef: firebase
          .firestore()
          .collection('commands')
          .doc(),
        command: c,
      })
    )

    addShutdownTask(() => job.cancel())
  })
}

async function loadLocalJobs() {
  cachedJobs = JSON.parse(await fs.readFile(jobFile))
  log.info('Loaded local copy of scheduled jobs', {jobs: cachedJobs})
  startScheduledJobs()
}

function listen() {
  // Process 1 command at a time
  const unsubscribe = firebase
    .firestore()
    .collection('scheduledJobs')
    .where('isEnabled', '==', true)
    .onSnapshot(
      async jobsSnapshot => {
        log.debug('Scheduled jobs updated')
        const sortedJobs = [...jobsSnapshot.docs]
          .sort((a, b) => {
            if (a.id < b.id) {
              return -1
            }

            if (a.id > b.id) {
              return 1
            }

            return 0
          })
          .map(document => document.data())

        if (isEqual(cachedJobs, sortedJobs)) {
          log.debug('No scheduled jobs changes, ignoring update')
          return
        }

        log.info('Scheduled jobs changed, storing updates')
        await fs.writeFile(jobFile, JSON.stringify(sortedJobs))
        cachedJobs = sortedJobs
        startScheduledJobs()
      },
      error => {
        log.error('Error listening to job schedule, shutting down.', error)
        shutdown()
      }
    )

  addShutdownTask(unsubscribe)
}
