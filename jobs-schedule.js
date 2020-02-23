'use strict'

const schedule = require('node-schedule')
const firebase = require('firebase')
const enqueueJob = require('./job-queue')
const {addShutdownTask} = require('./shutdown')
const log = require('./logging')

module.exports = startScheduledJobs

const commandSchedule = [
  {
    command: 'console',
    options: {message: 'hello'},
    schedule: '00,15,30,45 * * * * *',
  },
]

function startScheduledJobs() {
  log.info('Scheduling jobs')
  commandSchedule.forEach(c => {
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
