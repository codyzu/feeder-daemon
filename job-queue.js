'use strict'

module.exports = enqueue

let commandPromise = Promise.resolve()

function enqueue(job) {
  commandPromise = (async () => {
    await commandPromise
    return job()
  })()
}
