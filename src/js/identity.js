import * as Utils from './utils/utils'
import {WorkerQueue} from './utils/worker-queue'
import {DIDHelper} from './did'
import {Store} from './storage/store'

class Identity {

	constructor(ipfs, session, keys) {
		this.ipfs = ipfs
		this.session = session
		this.keys = keys
	}

	async register() {
		const registerQueue = new WorkerQueue()
		const key = await registerQueue.postIdleTask(this.keys.getKey, this.keys, Math.random().toString())
		Store.saveIncompleteIdentity(key.id)

		registerQueue.postIdleTask((key) => {
			return this.keys.getKeyInstance(key.id)
		})
		const didDoc = await registerQueue.postIdleTask(DIDHelper.generateDidDoc)
		registerQueue.postIdleTask((didDoc) => {
			return this.ipfs.add(new IPFS.Buffer(JSON.stringify(didDoc)))
		})
		registerQueue.postIdleTask((initialFiles, ...parameters) => {
			return this.ipfs.name.publish(initialFiles[0].hash, ...parameters)
		}, this, {key: 'did-key-' + key.id})
		
		const did = await registerQueue.postIdleTask((initialHashes) => {
			return DIDHelper.generateDid(initialHashes.name)
		})
		const completedDidDoc = DIDHelper.completeDidDoc(didDoc, did)
		const didDocString = JSON.stringify(completedDidDoc)
		localStorage.setItem('did-doc.' + key.id, didDocString)
	
		await registerQueue.postIdleTask((_, ...parameters) => {
			return this.ipfs.add(...parameters)
		}, this, new IPFS.Buffer(didDocString))
		await registerQueue.postIdleTask((files, ...parameters) => {
			return this.ipfs.name.publish(files[0].hash, ...parameters)
		}, this, {key: 'did-key-' + key.id})
		console.log('finisheeed')
		return did
	}

	async auth(did) {
		const didId = Utils.getIdFromDid(did)
		const privKey = await this.keys.getStoredKey(didId)
		const didDocString = localStorage.getItem('did-doc.' + didId)
		const didDoc = JSON.parse(didDocString)
		const publicProfileString = localStorage.getItem(`profile.public.${didId}`)
		const publicProfile = JSON.parse(publicProfileString)
		await this.session.setKey(privKey)
		this.session.setDidDoc(didDoc)
		this.session.setProfilePublic(publicProfile)
		return did
	}
}

export {Identity}