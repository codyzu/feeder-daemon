const shell = require('shelljs')
const logging = require('./logging')

module.exports = attemptUpdate

// Force an error if any commands fail, this simplifies checking the results
shell.config.fatal = true

// Facilitate debugging
shell.config.verbose = true

function attemptUpdate() {
  try {
    update()
  } catch (error) {
    if (error.restart) {
      logging.warn('Restarting after update')
      // Let a restart error get thrown so that the script ends
      throw error
    }

    // We simply log other update errors and continue starting
    logging.error('Error during update', error)
  }
}

function update() {
  logging.debug('Checking for git changes')

  shell.exec('git fetch')

  // https://stackoverflow.com/questions/3258243/check-if-pull-needed-in-git#comment20583358_3258271
  const behindCommitCount = Number.parseInt(
    shell
      .exec('git rev-list HEAD...origin/master --count')
      .stdout.split('\n')
      .filter(line => line.length > 0)[0],
    10
  )

  // Nothing to update? Stop now
  if (behindCommitCount === 0) {
    logging.info('No updates')
    return
  }

  logging.warn(`Needs update: ${behindCommitCount} commits behind`)

  // Pull the branch
  logging.debug('Pulling git changes')
  shell.exec('git pull')

  // Ensure the modules are up to date
  logging.debug('Updating node modules')
  shell.exec('yarn')

  const needsRestartError = new Error('Needs restart after update')
  needsRestartError.restart = true
  throw needsRestartError
}
