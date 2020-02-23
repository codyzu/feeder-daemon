'use strict'

const executeJob = require('./engine')
const log = require('./logging')
const {shutdown} = require('./shutdown')

module.exports = enqueue

let commandPromise = Promise.resolve()

function enqueue({documentRef, command}) {
  commandPromise = (async () => {
    await commandPromise
    runJob({documentRef, command})
  })()
}

async function runJob({documentRef, command}) {
  try {
    const results = await executeJob(command)

    const jobResults = {
      ...command,
      ...results,
      isPending: false,
      doneAt: new Date(),
    }
    log.info('Writing job results', {jobResults})
    await documentRef.set(jobResults, {merge: true})
  } catch (error) {
    log.error('Job execution error, shutting down', error)
    shutdown()
  }
}
