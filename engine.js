'use strict'

const commands = require('./commands')
const log = require('./logging')
const {shutdown} = require('./shutdown')

module.exports = runJob

async function runJob({documentRef, command}) {
  try {
    const commandResults = await runCommand(command)

    const jobResults = {
      ...command,
      ...commandResults.results,
      isPending: false,
      doneAt: new Date(),
    }
    log.info('Writing job results', {jobResults})
    await documentRef.set(jobResults, {merge: true})

    if (commandResults.postSave) {
      log.debug('Running postSave hook')
      await commandResults.postSave()
    }
  } catch (error) {
    log.error('Job execution error, shutting down', error)
    shutdown()
  }
}

async function runCommand(command) {
  log.info('Running command', {command})

  if (command.expiresAt !== undefined && command.expiresAt < new Date()) {
    log.warn('Command expired', {command})
    return {
      results: {isExpired: true},
    }
  }

  try {
    if (commands[command.command] === undefined) {
      throw new Error(`Command ${command.command} not found`)
    }

    const commandResults = await commands[command.command](command.options)

    log.debug('Command executed successfully')

    if (commandResults === undefined) {
      return {results: {isSuccess: true}}
    }

    if (commandResults.results === undefined) {
      return {
        ...commandResults,
        results: {isSuccess: true},
      }
    }

    return {
      ...commandResults,
      results: {...commandResults.results, isSuccess: true},
    }
  } catch (error) {
    log.error('Command error', error)
    return {
      results: {isSuccess: false, error: error.stack},
    }
  }
}
