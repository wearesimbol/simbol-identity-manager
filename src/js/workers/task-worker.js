// importScripts('http://localhost:8080/src/js/profiles/public-profile.js')

class CreateClaimTask {
	constructor() {
		console.log('Profile', 1)  
	}
	
	async process(IPFS, OrbitDB, password) {
		console.log('processing', param)
		const node = new IPFS({
			repo: 'ipfs',
			pass: password,
			EXPERIMENTAL: {
				pubsub: true,
				ipnsPubsub: true,
				dht: true
			},
			config: {
				Addresses: {
					Swarm: ['/dns4/ws-star.discovery.libp2p.io/tcp/443/wss/p2p-websocket-star']
				}
			}
		})

		let isReady = new Promise()
		node.once('ready', async () => {
			// Store.cleanUpRegistration(this.ipfs)
			console.log('Online status: ', node.isOnline() ? 'online' : 'offline')
			this.orbitDB = await OrbitDB.createInstance(node)
			console.log('ready')
			isReady.resolve()
			// statusEl.classList.toggle('hide')
			// registerBtn.disabled = false
			// loginBtn.disabled = false
			// if (!this.authed) {
			// 	this.addEventHandlers()
			// } else {
			// 	const did = this.session.getProfilePublic().did
			// 	workerQueue.postTask(() => {
			// 		return PublicProfile.create(did, this.keychain, this.orbitDB)
			// 	}, this)
			// 		.then((publicProfile) => this.publicProfile = publicProfile)
			// 	workerQueue.postTask((publicProfile) => publicProfile.load())
			// 		.then((publicProfileCache) => {
			// 			this.session.setProfilePublic(publicProfileCache)
			// 			this.reloadProfile(publicProfileCache)
			// 			this._respondRegistrationRequest()
			// 		})
			// 		.catch((e) => {
			// 			console.log(e)
			// 			this._logoutHandler()
			// 		})
			// }
		})
		return isReady
	}
}
registerTask('create-claim', CreateClaimTask)