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
let cachedJobsSchedule = []
let jobs = []

function startScheduledJobs(newJobsSchedule) {
  log.info('Scheduling jobs')

  log.info('Cancelling existing jobs')
  jobs.forEach(job => job.cancel())

  cachedJobsSchedule = newJobsSchedule

  jobs = cachedJobsSchedule.map(c => {
    log.debug('Scheduling job', {command: c})
    return schedule.scheduleJob(c.schedule, () =>
      enqueueJob({
        documentRef: firebase
          .firestore()
          .collection('jobs')
          .doc(),
        command: {createdAt: new Date(), ...c},
      })
    )
  })

  jobs.forEach(job => addShutdownTask(() => job.cancel()))
}

async function loadLocalJobs() {
  const localJobs = JSON.parse(await fs.readFile(jobFile))
  log.info('Loaded local copy of scheduled jobs', {jobs: localJobs})
  startScheduledJobs(localJobs)
}

function listen() {
  // Process 1 command at a time
  const unsubscribe = firebase
    .firestore()
    .collection('jobsSchedule')
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

        if (isEqual(cachedJobsSchedule, sortedJobs)) {
          log.debug('No scheduled jobs changes, ignoring update')
          return
        }

        log.info('Scheduled jobs changed, storing updates')
        await fs.writeFile(jobFile, JSON.stringify(sortedJobs, null, 2))
        startScheduledJobs(sortedJobs)
      },
      error => {
        log.error('Error listening to job schedule, shutting down.', error)
        shutdown()
      }
    )

  addShutdownTask(unsubscribe)
}
