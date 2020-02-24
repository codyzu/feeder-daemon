const {Console} = require('console')
const log = require('loglevel')
const {Logging} = require('@google-cloud/logging')
const {isString} = require('lodash')
const pack = require('./package')

const gCloudLogging = new Logging()
const gCloudLog = gCloudLogging.log('feeder-chorizo', {removeCircular: true})

const levelMap = {
  trace: 'debug',
  debug: 'debug',
  info: 'info',
  warn: 'warning',
  error: 'error',
}

const logConsole = new Console({
  stdout: process.stdout,
  stderr: process.stderr,
  inspectOptions: {breakLength: Infinity, compact: true, depth: 8},
})

const originalMethodFactory = log.methodFactory

function methodFactory(methodName, logLevel, loggerName) {
  // Skip loglevel internal logger.
  // Instead, use our console object to force the inspect to output on a single line.
  // const originalLog = originalMethodFactory(methodName, logLevel, loggerName)

  return logToGcloud
  function logToGcloud(...params) {
    logConsole[methodName](...params)

    // See https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry
    const entryData = Object.assign(
      {},
      isString(params[0]) ? {message: params[0]} : params[0],
      ...params.slice(1),
      getMessage(params)
    )

    // LogConsole[methodName](entryData)
    // OriginalLog(util.inspect(entryData))

    const level = levelMap[methodName]
    const entry = gCloudLog.entry(entryData)

    // Don't await the result... let gcloud logging batch and send them
    gCloudLog[level](entry)
  }
}

// See https://cloud.google.com/error-reporting/reference/rest/v1beta1/ServiceContext
const serviceContext = {
  service: 'feeder-daemon',
  version: pack.version,
}

// See https://cloud.google.com/error-reporting/docs/formatting-error-messages
function getMessage(params) {
  if (params.length === 0) {
    return
  }

  if (params[0].stack !== undefined) {
    return {message: params[0].stack, serviceContext}
  }

  if (
    isString(params[0]) &&
    params.length > 1 &&
    params[1].stack !== undefined
  ) {
    return {message: `${params[0]} ${params[1].stack}`, serviceContext}
  }

  if (isString(params[0])) {
    return {message: params[0]}
  }
}

log.methodFactory = methodFactory
log.setLevel(log.getLevel())

log.setLevel('trace')

module.exports = log
