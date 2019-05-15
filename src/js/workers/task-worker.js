importScripts('https://common-alarm.glitch.me/claims.js')

class CreateClaimTask {
  constructor() {
    console.log('Claims', Claims)  
  }
  
  async process() {
    console.log('processing')
    return true
  }
}
registerTask('create-claim', CreateClaimTask)